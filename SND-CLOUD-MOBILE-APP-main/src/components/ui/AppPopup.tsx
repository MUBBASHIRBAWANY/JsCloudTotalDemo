import { Feather } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '@/constants/app-theme';

export type PopupType = 'success' | 'error' | 'info' | 'confirm';

export type PopupButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'primary';
};

export type PopupShowOptions = {
  type?: PopupType;
  title: string;
  message?: string;
  buttons?: PopupButton[];
};

type AppPopupApi = {
  show: (options: PopupShowOptions) => void;
  success: (title: string, message?: string, onOk?: () => void) => void;
  error: (title: string, message?: string, onOk?: () => void) => void;
  info: (title: string, message?: string, onOk?: () => void) => void;
  confirm: (
    title: string,
    message: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
      onConfirm?: () => void;
      onCancel?: () => void;
    },
  ) => void;
};

type PopupState = PopupShowOptions & { visible: boolean };

const AppPopupContext = createContext<AppPopupApi | null>(null);

let popupRef: AppPopupApi | null = null;

/** Imperative access when a hook is awkward (e.g. navigation listeners). */
export const appPopup: AppPopupApi = {
  show: (options) => popupRef?.show(options),
  success: (title, message, onOk) => popupRef?.success(title, message, onOk),
  error: (title, message, onOk) => popupRef?.error(title, message, onOk),
  info: (title, message, onOk) => popupRef?.info(title, message, onOk),
  confirm: (title, message, options) => popupRef?.confirm(title, message, options),
};

export function useAppPopup(): AppPopupApi {
  const ctx = useContext(AppPopupContext);
  if (!ctx) {
    throw new Error('useAppPopup must be used within AppPopupProvider');
  }
  return ctx;
}

const iconFor = (type: PopupType): { name: React.ComponentProps<typeof Feather>['name']; color: string; bg: string } => {
  switch (type) {
    case 'success':
      return { name: 'check-circle', color: theme.colors.success, bg: theme.colors.successSoft };
    case 'error':
      return { name: 'alert-circle', color: theme.colors.danger, bg: theme.colors.dangerSoft };
    case 'confirm':
      return { name: 'help-circle', color: theme.colors.primary, bg: theme.colors.primarySoft };
    default:
      return { name: 'info', color: theme.colors.info, bg: theme.colors.infoSoft };
  }
};

export function AppPopupProvider({ children }: { children: React.ReactNode }) {
  const [popup, setPopup] = useState<PopupState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });
  const closingRef = useRef(false);

  const hide = useCallback(() => {
    closingRef.current = false;
    setPopup((prev) => ({ ...prev, visible: false }));
  }, []);

  const show = useCallback((options: PopupShowOptions) => {
    closingRef.current = false;
    setPopup({
      visible: true,
      type: options.type || 'info',
      title: options.title,
      message: options.message || '',
      buttons: options.buttons?.length
        ? options.buttons
        : [{ text: 'OK', style: 'primary' }],
    });
  }, []);

  const success = useCallback(
    (title: string, message?: string, onOk?: () => void) => {
      show({
        type: 'success',
        title,
        message,
        buttons: [{ text: 'OK', style: 'primary', onPress: onOk }],
      });
    },
    [show],
  );

  const error = useCallback(
    (title: string, message?: string, onOk?: () => void) => {
      show({
        type: 'error',
        title,
        message,
        buttons: [{ text: 'OK', style: 'primary', onPress: onOk }],
      });
    },
    [show],
  );

  const info = useCallback(
    (title: string, message?: string, onOk?: () => void) => {
      show({
        type: 'info',
        title,
        message,
        buttons: [{ text: 'OK', style: 'primary', onPress: onOk }],
      });
    },
    [show],
  );

  const confirm = useCallback(
    (
      title: string,
      message: string,
      options?: {
        confirmText?: string;
        cancelText?: string;
        destructive?: boolean;
        onConfirm?: () => void;
        onCancel?: () => void;
      },
    ) => {
      show({
        type: 'confirm',
        title,
        message,
        buttons: [
          { text: options?.cancelText || 'Cancel', style: 'cancel', onPress: options?.onCancel },
          {
            text: options?.confirmText || 'OK',
            style: options?.destructive ? 'destructive' : 'primary',
            onPress: options?.onConfirm,
          },
        ],
      });
    },
    [show],
  );

  const api = useMemo(
    () => ({ show, success, error, info, confirm }),
    [show, success, error, info, confirm],
  );

  popupRef = api;

  const type = popup.type || 'info';
  const icon = iconFor(type);
  const buttons = popup.buttons || [];

  const onButtonPress = (button: PopupButton) => {
    if (closingRef.current) return;
    closingRef.current = true;
    hide();
    // Let the modal close before running navigation / follow-up UI.
    setTimeout(() => button.onPress?.(), 80);
  };

  return (
    <AppPopupContext.Provider value={api}>
      {children}
      <Modal
        visible={popup.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          const cancel = buttons.find((b) => b.style === 'cancel');
          if (cancel) onButtonPress(cancel);
          else hide();
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: icon.bg }]}>
              <Feather name={icon.name} size={28} color={icon.color} />
            </View>
            <Text style={styles.title}>{popup.title}</Text>
            {popup.message ? <Text style={styles.message}>{popup.message}</Text> : null}
            <View style={[styles.actions, buttons.length > 1 && styles.actionsRow]}>
              {buttons.map((button, index) => {
                const kind = button.style || (index === buttons.length - 1 ? 'primary' : 'cancel');
                return (
                  <TouchableOpacity
                    key={`${button.text}-${index}`}
                    style={[
                      styles.button,
                      buttons.length > 1 && styles.buttonFlex,
                      kind === 'primary' && styles.buttonPrimary,
                      kind === 'cancel' && styles.buttonCancel,
                      kind === 'destructive' && styles.buttonDestructive,
                      kind === 'default' && styles.buttonCancel,
                    ]}
                    onPress={() => onButtonPress(button)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        kind === 'primary' && styles.buttonTextPrimary,
                        kind === 'cancel' && styles.buttonTextCancel,
                        kind === 'destructive' && styles.buttonTextDestructive,
                        kind === 'default' && styles.buttonTextCancel,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AppPopupContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingTop: 26,
    paddingBottom: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  actions: {
    marginTop: 22,
    width: '100%',
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  button: {
    minHeight: 46,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  buttonCancel: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  buttonDestructive: {
    backgroundColor: theme.colors.danger,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextCancel: {
    color: theme.colors.text,
  },
  buttonTextDestructive: {
    color: '#FFFFFF',
  },
});
