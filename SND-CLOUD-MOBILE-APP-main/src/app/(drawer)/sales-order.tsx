import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useAppPopup } from '@/components/ui/AppPopup';
import { theme } from '@/constants/app-theme';
import { roleHomePath, useLoginUser, type Row } from '@/hooks/useLoginUser';
import { isPendingCustomer } from '@/lib/customerForm';
import { sendPendingData } from '@/lib/sendPending';
import type { RootState } from '@/redux/Store/types';

const SyncDataScreen = () => {
  const popup = useAppPopup();
  const { dispatch, loginVendor, loginRole, distributorId, orderBookerId } = useLoginUser();
  const homePath = roleHomePath(loginRole || loginVendor?.loginRole);
  const pendingOrders = useSelector((state: RootState) => state.SalesOrder.SalesOrder) as Row[];
  const distributors = useSelector((state: RootState) => state.distributors.Distributor) as Row[];
  const pendingCustomers = useMemo(
    () => distributors.filter((row) => isPendingCustomer(row)),
    [distributors],
  );
  const pendingCount = pendingOrders.length + pendingCustomers.length;
  const [sending, setSending] = useState(false);

  const uploadPending = async () => {
    if (!loginVendor) {
      throw new Error('Not signed in');
    }
    return sendPendingData({
      dispatch,
      customers: distributors,
      orders: pendingOrders,
      distributorId,
      orderBookerId,
    });
  };

  const syncData = () => {
    if (!loginVendor) {
      popup.error('Not signed in', 'Please log in again.');
      return;
    }
    if (pendingCount === 0) {
      popup.info('Sync Data', 'Everything is already up to date. Nothing waiting to send.');
      return;
    }
    popup.confirm(
      'Sync Data',
      `Send ${pendingCount} saved item${pendingCount === 1 ? '' : 's'} to the server?`,
      {
        confirmText: 'Sync now',
        onConfirm: () => {
          setSending(true);
          uploadPending()
            .then((result) => {
              if (result.dates.length > 0) {
                router.push({
                  pathname: '/day-summary',
                  params: { dates: result.dates.join(',') },
                });
                return;
              }
              popup.success('Sync Data', 'All pending data sent successfully.');
            })
            .catch(() => {
              popup.error(
                'Sync Data',
                'Could not sync everything. What is still on this phone was not sent.',
              );
            })
            .finally(() => setSending(false));
        },
      },
    );
  };

  const statusLabel =
    pendingCount === 0
      ? 'All synced'
      : `${pendingCount} item${pendingCount === 1 ? '' : 's'} waiting`;

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.heroCard}>
          <View style={[styles.iconWrap, pendingCount > 0 ? styles.iconWrapPending : styles.iconWrapOk]}>
            <Feather
              name={pendingCount > 0 ? 'cloud-off' : 'cloud'}
              size={36}
              color={pendingCount > 0 ? theme.colors.warning : theme.colors.success}
            />
          </View>

          <Text style={styles.title}>Sync Data</Text>
          <Text style={styles.subtitle}>
            Upload customers and orders saved on this phone to the server.
          </Text>

          <View style={[styles.statusPill, pendingCount > 0 ? styles.statusPending : styles.statusOk]}>
            <View style={[styles.statusDot, pendingCount > 0 ? styles.dotPending : styles.dotOk]} />
            <Text style={[styles.statusText, pendingCount > 0 ? styles.statusTextPending : styles.statusTextOk]}>
              {statusLabel}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.syncButton, (sending || pendingCount === 0) && styles.syncButtonDisabled]}
            onPress={syncData}
            disabled={sending || pendingCount === 0}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="refresh-cw" size={18} color="#FFFFFF" />
                <Text style={styles.syncButtonText}>
                  {pendingCount === 0 ? 'Nothing to sync' : 'Sync now'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, sending && styles.syncButtonDisabled]}
            onPress={() => router.replace(homePath)}
            disabled={sending}
            activeOpacity={0.85}
          >
            <Feather name="home" size={16} color={theme.colors.primary} />
            <Text style={styles.secondaryText}>Continue to Home</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hintRow}>
          <Feather name="info" size={16} color={theme.colors.muted} />
          <Text style={styles.hintText}>
            Keep a stable connection while syncing. You can take new orders after pending items are sent.
          </Text>
        </View>
      </View>

      <Modal visible={sending} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loaderTitle}>Syncing…</Text>
            <Text style={styles.loaderMeta}>
              Uploading {pendingCount} item{pendingCount === 1 ? '' : 's'} to the server. Please wait.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 4,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  iconWrapOk: {
    backgroundColor: theme.colors.successSoft,
  },
  iconWrapPending: {
    backgroundColor: theme.colors.warningSoft,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 10,
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
  },
  statusPill: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusOk: {
    backgroundColor: theme.colors.successSoft,
  },
  statusPending: {
    backgroundColor: theme.colors.warningSoft,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOk: {
    backgroundColor: theme.colors.success,
  },
  dotPending: {
    backgroundColor: theme.colors.warning,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusTextOk: {
    color: theme.colors.success,
  },
  statusTextPending: {
    color: theme.colors.warning,
  },
  syncButton: {
    marginTop: 28,
    minHeight: 52,
    minWidth: 200,
    paddingHorizontal: 28,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  syncButtonDisabled: {
    opacity: 0.55,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 46,
    minWidth: 220,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  hintRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 8,
  },
  hintText: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
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

export default SyncDataScreen;
