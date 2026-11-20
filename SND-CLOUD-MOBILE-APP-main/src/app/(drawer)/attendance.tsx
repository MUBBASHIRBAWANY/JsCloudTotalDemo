import {
  attendanceLocalDate,
  fetchTodayAttendance,
  markAttendance,
  type AttendanceImage,
} from '@/api/AttendanceService';
import { useInAppCamera } from '@/components/InAppCamera';
import { useAppPopup } from '@/components/ui/AppPopup';
import { theme } from '@/constants/app-theme';
import { roleHomePath, useLoginUser } from '@/hooks/useLoginUser';
import { isOnline } from '@/lib/connectivity';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type AttendanceType = 'check-in' | 'check-out';

const AttendanceScreen = () => {
  const popup = useAppPopup();
  const { capturePhoto: openCamera, cameraModal } = useInAppCamera();
  const { loginVendor, loginServer, loginRole } = useLoginUser();
  const bookername = loginVendor?.OrderBookerName?.trim() || loginVendor?.firstname?.trim() || '';
  const userId = loginVendor?._id ?? '';
  const homePath = roleHomePath(loginRole || loginVendor?.loginRole);

  const [activeTab, setActiveTab] = useState<AttendanceType>('check-in');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [todayDate, setTodayDate] = useState(attendanceLocalDate());

  const applyTodayStatus = useCallback((checkedIn: boolean, checkedOut: boolean, date: string) => {
    setAlreadyCheckedIn(checkedIn);
    setHasCheckedOut(checkedOut);
    setTodayDate(date);
    if (checkedOut) setActiveTab('check-out');
    else if (checkedIn) setActiveTab('check-out');
    else setActiveTab('check-in');
  }, []);

  const loadTodayStatus = useCallback(async () => {
    if (!userId) {
      setLoadingStatus(false);
      return;
    }
    setLoadingStatus(true);
    const online = await isOnline();
    if (!online) {
      // No internet: use phone store and open dashboard.
      setLoadingStatus(false);
      router.replace(homePath);
      return;
    }
    const statusToday = await fetchTodayAttendance(userId, loginServer);
    applyTodayStatus(statusToday.checkedIn, statusToday.checkedOut, statusToday.date);
    setLoadingStatus(false);
  }, [applyTodayStatus, homePath, loginServer, userId]);

  useFocusEffect(
    useCallback(() => {
      void loadTodayStatus();
    }, [loadTodayStatus]),
  );

  const status = useMemo(() => {
    if (hasCheckedOut) return { label: 'Checked out today', tone: 'ok' as const };
    if (alreadyCheckedIn) return { label: 'Checked in today', tone: 'pending' as const };
    return { label: 'Not checked in today', tone: 'idle' as const };
  }, [alreadyCheckedIn, hasCheckedOut]);

  const getLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') {
        popup.error('Permission needed', 'Location permission is required to mark attendance.');
        return null;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
    } catch {
      popup.error('Location error', 'Could not read GPS location. Try again outdoors.');
      return null;
    }
  };

  const capturePhoto = async (): Promise<AttendanceImage | null> => {
    try {
      // In-app camera — system camera intent crashes/reloads on some Androids (OnePlus N300).
      const photo = await openCamera({
        facing: 'front',
        title: activeTab === 'check-in' ? 'Check-in photo' : 'Check-out photo',
      });
      if (!photo?.uri) return null;
      const filename = photo.fileName || `attendance-${Date.now()}.jpg`;
      return {
        filename,
        type: photo.mimeType || 'image/jpeg',
        uri: photo.uri,
      };
    } catch {
      popup.error('Camera error', 'Could not open the camera. Please try again.');
      return null;
    }
  };

  const friendlyAttendanceMessage = (raw: string) => {
    const lower = raw.toLowerCase();
    if (lower.includes('allready check-in') || lower.includes('already check-in') || lower.includes('already checked in')) {
      return 'You are already checked in for today.';
    }
    if (lower.includes('allready check-out') || lower.includes('already check-out') || lower.includes('already checked out')) {
      return 'You are already checked out for today.';
    }
    return raw || 'Could not mark attendance. Please try again.';
  };

  const resetCapture = () => {
    setImageUri(null);
    setLocation(null);
  };

  const handleMarkAttendance = async () => {
    if (processing) return;
    if (activeTab === 'check-in' && alreadyCheckedIn) {
      popup.info('Already checked in', 'You already marked check-in. Use Mark Out when your day ends.');
      return;
    }
    if (activeTab === 'check-out' && hasCheckedOut) {
      popup.info('Already checked out', 'Check-out is already recorded for this session.');
      return;
    }

    try {
      // Camera first (no blocking overlay) — in-app camera must stay interactive.
      const photo = await capturePhoto();
      if (!photo) return;
      setImageUri(photo.uri);

      setProcessing(true);
      const gps = await getLocation();
      if (!gps) {
        setProcessing(false);
        return;
      }
      setLocation(gps);

      setUploading(true);
      const now = new Date();
      const date = attendanceLocalDate(now);
      const time = now.toTimeString().split(' ')[0];

      await markAttendance({
        userId,
        bookername,
        image: photo,
        latitude: gps.latitude,
        longitude: gps.longitude,
        markingType: activeTab,
        date,
        time,
        distributorId: loginVendor?.Distributor || loginVendor?.distributor || '',
        server: loginServer,
      });

      if (activeTab === 'check-in') {
        applyTodayStatus(true, false, date);
      } else {
        applyTodayStatus(true, true, date);
      }

      setUploading(false);
      setProcessing(false);
      popup.success(
        activeTab === 'check-in' ? 'Check-in successful' : 'Check-out successful',
        activeTab === 'check-in'
          ? 'Your attendance check-in has been recorded.'
          : 'Your attendance check-out has been recorded.',
        () => {
          resetCapture();
          if (activeTab === 'check-in') router.replace(homePath);
        },
      );
    } catch (error: unknown) {
      setUploading(false);
      setProcessing(false);
      const raw = error instanceof Error ? error.message : 'Failed to mark attendance';
      const message = friendlyAttendanceMessage(raw);
      const alreadyIn =
        message.toLowerCase().includes('already checked in')
        || raw.toLowerCase().includes('allready check-in')
        || raw.toLowerCase().includes('already check-in');
      const alreadyOut =
        message.toLowerCase().includes('already checked out')
        || raw.toLowerCase().includes('allready check-out')
        || raw.toLowerCase().includes('already check-out');

      if (alreadyIn) {
        applyTodayStatus(true, hasCheckedOut, attendanceLocalDate());
        setActiveTab('check-out');
        popup.info('Already checked in', message, () => {
          resetCapture();
          router.replace(homePath);
        });
        return;
      }
      if (alreadyOut) {
        applyTodayStatus(true, true, attendanceLocalDate());
        popup.info('Already checked out', message, resetCapture);
        return;
      }
      popup.error('Attendance failed', message);
    }
  };

  const primaryDisabled =
    processing
    || (activeTab === 'check-in' && alreadyCheckedIn)
    || (activeTab === 'check-out' && hasCheckedOut);

  if (loadingStatus) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <View style={styles.heroCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.title, { marginTop: 16 }]}>Attendance</Text>
            <Text style={styles.subtitle}>Checking today’s attendance…</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.heroCard}>
          <View
            style={[
              styles.iconWrap,
              status.tone === 'ok' && styles.iconOk,
              status.tone === 'pending' && styles.iconPending,
              status.tone === 'idle' && styles.iconIdle,
            ]}
          >
            <Feather
              name={status.tone === 'ok' ? 'log-out' : status.tone === 'pending' ? 'log-in' : 'clock'}
              size={32}
              color={
                status.tone === 'ok'
                  ? theme.colors.success
                  : status.tone === 'pending'
                    ? theme.colors.warning
                    : theme.colors.primary
              }
            />
          </View>

          <Text style={styles.title}>Attendance</Text>
          <Text style={styles.subtitle}>
            {alreadyCheckedIn
              ? `Today (${todayDate}) attendance is already on record.`
              : `Mark check-in for today (${todayDate}) with photo and GPS.`}
          </Text>

          <View
            style={[
              styles.statusPill,
              status.tone === 'ok' && styles.statusOk,
              status.tone === 'pending' && styles.statusPending,
              status.tone === 'idle' && styles.statusIdle,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                status.tone === 'ok' && styles.dotOk,
                status.tone === 'pending' && styles.dotPending,
                status.tone === 'idle' && styles.dotIdle,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                status.tone === 'ok' && styles.statusTextOk,
                status.tone === 'pending' && styles.statusTextPending,
                status.tone === 'idle' && styles.statusTextIdle,
              ]}
            >
              {status.label}
            </Text>
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'check-in' && styles.tabActive]}
              onPress={() => setActiveTab('check-in')}
              disabled={processing}
            >
              <Feather
                name="log-in"
                size={16}
                color={activeTab === 'check-in' ? '#FFFFFF' : theme.colors.muted}
              />
              <Text style={[styles.tabText, activeTab === 'check-in' && styles.tabTextActive]}>
                Mark In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'check-out' && styles.tabActive]}
              onPress={() => setActiveTab('check-out')}
              disabled={processing}
            >
              <Feather
                name="log-out"
                size={16}
                color={activeTab === 'check-out' ? '#FFFFFF' : theme.colors.muted}
              />
              <Text style={[styles.tabText, activeTab === 'check-out' && styles.tabTextActive]}>
                Mark Out
              </Text>
            </TouchableOpacity>
          </View>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Feather name="camera" size={28} color={theme.colors.muted} />
              <Text style={styles.previewHint}>Photo will appear here after capture</Text>
            </View>
          )}

          {location ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color={theme.colors.primary} />
              <Text style={styles.locationText}>
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, primaryDisabled && styles.primaryDisabled]}
            onPress={handleMarkAttendance}
            disabled={primaryDisabled}
            activeOpacity={0.85}
          >
            {processing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name={activeTab === 'check-in' ? 'log-in' : 'log-out'} size={18} color="#FFFFFF" />
                <Text style={styles.primaryText}>
                  {activeTab === 'check-in' ? 'Mark Check-In' : 'Mark Check-Out'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {alreadyCheckedIn ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace(homePath)}
              disabled={processing}
              activeOpacity={0.85}
            >
              <Feather name="home" size={16} color={theme.colors.primary} />
              <Text style={styles.secondaryText}>Continue to Home</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.hintRow}>
          <Feather name="info" size={16} color={theme.colors.muted} />
          <Text style={styles.hintText}>
            Camera and location are required. If you already checked in today, use Mark Out at the end of your day.
          </Text>
        </View>
      </View>

      <Modal visible={processing} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loaderTitle}>{uploading ? 'Submitting…' : 'Preparing…'}</Text>
            <Text style={styles.loaderMeta}>
              {uploading ? 'Sending photo and location to the server.' : 'Opening camera and reading GPS.'}
            </Text>
          </View>
        </View>
      </Modal>
      {cameraModal}
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
    paddingBottom: 36,
  },
  heroCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 4,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconOk: { backgroundColor: theme.colors.successSoft },
  iconPending: { backgroundColor: theme.colors.warningSoft },
  iconIdle: { backgroundColor: theme.colors.primarySoft },
  title: {
    color: theme.colors.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  statusPill: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusOk: { backgroundColor: theme.colors.successSoft },
  statusPending: { backgroundColor: theme.colors.warningSoft },
  statusIdle: { backgroundColor: theme.colors.primarySoft },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotOk: { backgroundColor: theme.colors.success },
  dotPending: { backgroundColor: theme.colors.warning },
  dotIdle: { backgroundColor: theme.colors.primary },
  statusText: { fontSize: 13, fontWeight: '700' },
  statusTextOk: { color: theme.colors.success },
  statusTextPending: { color: theme.colors.warning },
  statusTextIdle: { color: theme.colors.primary },
  tabRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  preview: {
    marginTop: 18,
    width: '100%',
    height: 180,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
  },
  previewPlaceholder: {
    marginTop: 18,
    width: '100%',
    height: 140,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewHint: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  locationRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 22,
    minHeight: 52,
    minWidth: 220,
    paddingHorizontal: 24,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryDisabled: {
    opacity: 0.55,
  },
  primaryText: {
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
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 6,
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

export default AttendanceScreen;
