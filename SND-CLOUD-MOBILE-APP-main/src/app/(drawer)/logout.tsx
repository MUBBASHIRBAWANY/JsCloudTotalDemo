import { attendanceLocalDate, fetchTodayAttendance } from '@/api/AttendanceService';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useAppPopup } from '@/components/ui/AppPopup';
import { theme, ui } from '@/constants/app-theme';
import { clearLoginSession, useLoginUser, type Row } from '@/hooks/useLoginUser';
import { isPendingCustomer } from '@/lib/customerForm';
import { isOnline } from '@/lib/connectivity';
import { fetchNetworkDate } from '@/lib/networkTime';
import type { RootState } from '@/redux/Store/types';

type LogoutStep = 'idle' | 'checking' | 'signing-out';

/** Sunday (Asia/Karachi calendar day) — attendance gate skipped on logout. */
const isSundayDate = (yyyyMmDd: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(yyyyMmDd || '').trim());
  if (!match) return false;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() === 0;
};

const LogoutScreen = () => {
  const popup = useAppPopup();
  const { loginVendor, loginServer, orderBookerId } = useLoginUser();
  const pendingOrders = useSelector((state: RootState) => state.SalesOrder.SalesOrder) as Row[];
  const distributors = useSelector((state: RootState) => state.distributors.Distributor) as Row[];
  const pendingCustomers = useMemo(
    () => distributors.filter((row) => isPendingCustomer(row)),
    [distributors],
  );
  const waitingCount = pendingOrders.length + pendingCustomers.length;
  const [loggingOut, setLoggingOut] = useState(false);
  const [step, setStep] = useState<LogoutStep>('idle');

  const finishSignOut = async () => {
    setStep('signing-out');
    await clearLoginSession();
    router.replace('/');
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setStep('checking');
    try {
      const online = await isOnline();
      if (!online) {
        popup.error(
          'No internet',
          'Connect to the internet to verify attendance and pending sync before logout.',
        );
        return;
      }

      const userId = orderBookerId || loginVendor?._id || '';
      let todayDate = attendanceLocalDate();
      try {
        todayDate = await fetchNetworkDate();
      } catch {
        // Fall back to local date if network time is unavailable.
      }

      // Sunday: skip attendance gate. Other days: check-in and check-out required first.
      if (userId && !isSundayDate(todayDate)) {
        const attendance = await fetchTodayAttendance(userId, loginServer);
        if (!attendance.checkedIn || !attendance.checkedOut) {
          const missing = !attendance.checkedIn ? 'check-in' : 'check-out';
          popup.show({
            type: 'info',
            title: !attendance.checkedIn ? 'Check-in required' : 'Check-out required',
            message: `Mark attendance ${missing} before logout. After that, sync any pending data from Sync Data, then sign out again.`,
            buttons: [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Go to Attendance',
                style: 'primary',
                onPress: () => router.replace('/attendance'),
              },
            ],
          });
          return;
        }
      }

      // Like attendance: do not auto-sync — send user to Sync Data screen.
      if (waitingCount > 0) {
        popup.show({
          type: 'info',
          title: 'Sync required',
          message: `${waitingCount} item${waitingCount === 1 ? '' : 's'} still on this phone. Sync them first, then sign out again.`,
          buttons: [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Go to Sync Data',
              style: 'primary',
              onPress: () => router.replace('/sales-order'),
            },
          ],
        });
        return;
      }

      await finishSignOut();
    } catch {
      popup.error(
        'Logout blocked',
        'Could not finish attendance or sync check. You are still signed in.',
      );
    } finally {
      setLoggingOut(false);
      setStep('idle');
    }
  };

  const loaderTitle = step === 'checking' ? 'Checking…' : 'Signing out…';
  const loaderMeta =
    step === 'checking'
      ? 'Verifying attendance and pending sync before logout.'
      : 'Please wait.';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Feather name="log-out" size={26} color={theme.colors.danger} />
        </View>
        <Text style={styles.title}>Sign out</Text>
        <Text style={styles.subtitle}>
          Before logout: (1) today’s check-in and check-out (skipped on Sunday), and
          (2) sync pending data yourself from Sync Data — logout will not sync automatically.
        </Text>
        {waitingCount > 0 ? (
          <Text style={styles.pendingNote}>
            {waitingCount} item{waitingCount === 1 ? '' : 's'} waiting to sync
          </Text>
        ) : null}
        <TouchableOpacity
          style={[styles.button, loggingOut && ui.disabled]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Logout</Text>
          )}
        </TouchableOpacity>
      </View>
      <Modal visible={loggingOut} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loaderTitle}>{loaderTitle}</Text>
            <Text style={styles.loaderMeta}>{loaderMeta}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 14,
  },
  pendingNote: {
    marginBottom: 18,
    color: theme.colors.warning,
    backgroundColor: theme.colors.warningSoft,
    fontWeight: '700',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  button: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  loaderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loaderCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  loaderTitle: {
    marginTop: 16,
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  loaderMeta: {
    marginTop: 8,
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default LogoutScreen;
