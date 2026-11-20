import { updateDataFunction as updateCloudPassword } from '@/api/CurdFunctions';
import { updateDataFunction as updateSndPassword } from '@/api/SNDCurdFunctions';
import { theme, ui } from '@/constants/app-theme';
import {
  clearLoginSession,
  clearMustChangePassword,
  readMustChangePassword,
  useLoginUser,
} from '@/hooks/useLoginUser';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardSafeScrollView } from '@/components/KeyboardSafeScrollView';
import { appPopup, useAppPopup } from '@/components/ui/AppPopup';

const DEFAULT_PASSWORD = '123';

type BeforeRemoveEvent = {
  preventDefault: () => void;
};

type NavWithBeforeRemove = {
  setOptions: (options: Record<string, unknown>) => void;
  getParent: () => { setOptions?: (options: Record<string, unknown>) => void } | undefined;
  addListener: (
    event: 'beforeRemove',
    callback: (event: BeforeRemoveEvent) => void,
  ) => () => void;
};

const blockLeaveMessage = () => {
  appPopup.info(
    'Change password required',
    'You must set a new password before leaving this screen.',
  );
};

const ChangePasswordScreen = () => {
  const popup = useAppPopup();
  const { force } = useLocalSearchParams<{ force?: string }>();
  const navigation = useNavigation() as unknown as NavWithBeforeRemove;
  const { loginVendor, loginServer } = useLoginUser();
  const [forced, setForced] = useState(force === '1');
  const allowLeaveRef = useRef(false);
  const [currentPassword, setCurrentPassword] = useState(force === '1' ? DEFAULT_PASSWORD : '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (force === '1') {
      setForced(true);
      setCurrentPassword((prev) => prev || DEFAULT_PASSWORD);
    }
  }, [force]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void readMustChangePassword().then((must) => {
        if (!active || !must) return;
        setForced(true);
        setCurrentPassword((prev) => prev || DEFAULT_PASSWORD);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  // Forced: hide header back / drawer toggle, lock swipe, block hardware + nav back.
  useFocusEffect(
    useCallback(() => {
      if (!forced) {
        navigation.setOptions({
          headerLeft: undefined,
          gestureEnabled: true,
        });
        navigation.getParent()?.setOptions?.({ swipeEnabled: true });
        return undefined;
      }

      navigation.setOptions({
        headerLeft: () => null,
        gestureEnabled: false,
      });
      navigation.getParent()?.setOptions?.({ swipeEnabled: false });

      const unsubscribe = navigation.addListener('beforeRemove', (event) => {
        if (allowLeaveRef.current) return;
        event.preventDefault();
        blockLeaveMessage();
      });

      const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (allowLeaveRef.current) return false;
        blockLeaveMessage();
        return true;
      });

      return () => {
        unsubscribe();
        backSub.remove();
        navigation.getParent()?.setOptions?.({ swipeEnabled: true });
      };
    }, [forced, navigation]),
  );

  const handleSave = async () => {
    if (saving) return;
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();
    const current = currentPassword.trim();

    if (!current || !next || !confirm) {
      popup.error('Error', 'Please fill in all fields');
      return;
    }
    if (forced && current !== DEFAULT_PASSWORD) {
      popup.error('Error', 'Current password must be the default password (123)');
      return;
    }
    if (!forced && !current) {
      popup.error('Error', 'Enter your current password');
      return;
    }
    if (next === DEFAULT_PASSWORD) {
      popup.error('Error', 'New password cannot be 123. Choose a different password.');
      return;
    }
    if (next.length < 4) {
      popup.error('Error', 'New password must be at least 4 characters');
      return;
    }
    if (next !== confirm) {
      popup.error('Error', 'New password and confirm password do not match');
      return;
    }
    if (!forced && current === next) {
      popup.error('Error', 'New password must be different from the current password');
      return;
    }

    const userId = loginVendor?._id;
    if (!userId) {
      popup.info('Session expired', 'Please log in again.');
      await clearLoginSession();
      router.replace('/');
      return;
    }

    setSaving(true);
    try {
      const body = { newPassword: next, currentPassword: current };
      const role = String(loginVendor?.loginRole || '').toLowerCase();
      const isUserRole = role === 'tsm' || role === 'zsm';
      if (loginServer === 'snd') {
        await updateSndPassword(
          isUserRole
            ? `/users/updatePassword/${userId}`
            : `/OrderBooker/updatePassword/${userId}`,
          body,
        );
      } else {
        await updateCloudPassword(
          isUserRole
            ? `/users/updatePassword/${userId}`
            : `/DitriButorOrderBooker/updatePassword/${userId}`,
          body,
        );
      }

      await clearMustChangePassword();

      if (forced) {
        allowLeaveRef.current = true;
        await clearLoginSession();
        router.replace('/');
        popup.success(
          'Password changed',
          'Your password was updated. Please log in again with your new password.',
        );
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      popup.success('Success', 'Password updated successfully.');
    } catch (error) {
      const message =
        (error as { response?: { data?: unknown } })?.response?.data;
      const text =
        typeof message === 'string'
          ? message
          : (message as { message?: string })?.message || 'Could not update password. Try again.';
      popup.error('Change password failed', text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardSafeScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      extraOffset={32}
    >
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Feather name="lock" size={26} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>{forced ? 'Set a new password' : 'Change password'}</Text>
        <Text style={styles.subtitle}>
          {forced
            ? 'Your account is using the default password (123). Choose a new password to continue. You will sign in again after this.'
            : 'Enter your current password and choose a new one. Do not use 123.'}
        </Text>

        {!forced ? (
          <View style={styles.inputRow}>
            <Feather name="unlock" size={18} color={theme.colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Current password"
              placeholderTextColor="#999"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
              returnKeyType="next"
            />
            <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} style={styles.eye}>
              <Feather name={showCurrent ? 'eye-off' : 'eye'} size={18} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <Feather name="lock" size={18} color={theme.colors.primary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor="#999"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNew}
            autoCapitalize="none"
            returnKeyType="next"
          />
          <TouchableOpacity onPress={() => setShowNew((v) => !v)} style={styles.eye}>
            <Feather name={showNew ? 'eye-off' : 'eye'} size={18} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputRow}>
          <Feather name="check-circle" size={18} color={theme.colors.primary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={() => {
              if (!saving) void handleSave();
            }}
          />
          <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} style={styles.eye}>
            <Feather name={showConfirm ? 'eye-off' : 'eye'} size={18} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, saving && ui.disabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{forced ? 'Save and sign out' : 'Update password'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardSafeScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 48,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 24,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 22,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: theme.colors.ink,
  },
  eye: {
    padding: 6,
  },
  button: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default ChangePasswordScreen;
