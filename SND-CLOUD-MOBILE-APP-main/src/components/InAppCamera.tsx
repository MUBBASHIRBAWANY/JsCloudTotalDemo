import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/app-theme';

export type CapturedPhoto = {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
  mimeType?: string;
};

type Props = {
  visible: boolean;
  /** Prefer back camera for order photos; front for attendance selfies if needed. */
  facing?: CameraType;
  title?: string;
  onCancel: () => void;
  onCapture: (photo: CapturedPhoto) => void;
};

/**
 * In-app camera (expo-camera). Avoids Android system-camera handoff that
 * kills the JS process on low-RAM phones (e.g. OnePlus Nord N300) and looks
 * like a crash/reload after taking a picture.
 */
export function InAppCameraModal({
  visible,
  facing = 'back',
  title = 'Take photo',
  onCancel,
  onCapture,
}: Props) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>(facing);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setReady(false);
      setBusy(false);
      setError('');
      setCameraFacing(facing);
      return;
    }
    if (permission && !permission.granted) {
      void requestPermission();
    }
  }, [facing, permission, requestPermission, visible]);

  const takePicture = async () => {
    if (!cameraRef.current || !ready || busy) return;
    setBusy(true);
    setError('');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.45,
        shutterSound: false,
        skipProcessing: false,
        exif: false,
      });
      if (!photo?.uri) {
        setError('Could not capture photo. Try again.');
        setBusy(false);
        return;
      }
      onCapture({
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        fileName: photo.uri.split('/').pop()?.split('?')[0] || `photo-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      });
    } catch {
      setError('Camera failed on this device. Close and try again.');
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.shell}>
        {!permission ? (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : !permission.granted ? (
          <View style={[styles.center, { paddingTop: insets.top }]}>
            <Text style={styles.permissionTitle}>Camera permission needed</Text>
            <Text style={styles.permissionText}>
              Allow camera access so photos stay inside the app. This avoids reload/crash on some Android phones.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => void requestPermission()}>
              <Text style={styles.primaryBtnText}>Allow camera</Text>
            </Pressable>
            <Pressable style={styles.ghostBtn} onPress={onCancel}>
              <Text style={styles.ghostBtnText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={cameraFacing}
              mode="picture"
              mirror={false}
              onCameraReady={() => setReady(true)}
              onMountError={() => setError('Could not start camera on this phone.')}
            />

            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
              <Pressable style={styles.iconBtn} onPress={onCancel} accessibilityLabel="Close camera">
                <Feather name="x" size={22} color="#fff" />
              </Pressable>
              <Text style={styles.title}>{title}</Text>
              <Pressable
                style={styles.iconBtn}
                onPress={() => setCameraFacing((current) => (current === 'back' ? 'front' : 'back'))}
                accessibilityLabel="Flip camera"
              >
                <Feather name="refresh-cw" size={20} color="#fff" />
              </Pressable>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 18) }]}>
              {!ready || busy ? (
                <ActivityIndicator color="#fff" style={{ marginBottom: 12 }} />
              ) : null}
              <Pressable
                style={[styles.shutter, (!ready || busy) && styles.shutterOff]}
                onPress={() => void takePicture()}
                disabled={!ready || busy}
                accessibilityLabel="Capture photo"
              >
                <View style={styles.shutterInner} />
              </Pressable>
              <Text style={styles.hint}>{busy ? 'Saving…' : 'Tap to capture'}</Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

type Pending = {
  resolve: (photo: CapturedPhoto | null) => void;
  facing: CameraType;
  title: string;
};

/**
 * Promise-based camera capture for screens that previously used
 * ImagePicker.launchCameraAsync (which crashes/reloads on some Androids).
 */
export function useInAppCamera() {
  const [pending, setPending] = useState<Pending | null>(null);

  const capturePhoto = (options?: { facing?: CameraType; title?: string }) =>
    new Promise<CapturedPhoto | null>((resolve) => {
      setPending({
        resolve,
        facing: options?.facing || 'back',
        title: options?.title || 'Take photo',
      });
    });

  const finish = (photo: CapturedPhoto | null) => {
    pending?.resolve(photo);
    setPending(null);
  };

  const cameraModal = (
    <InAppCameraModal
      visible={Boolean(pending)}
      facing={pending?.facing || 'back'}
      title={pending?.title || 'Take photo'}
      onCancel={() => finish(null)}
      onCapture={(photo) => finish(photo)}
    />
  );

  return { capturePhoto, cameraModal };
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
    backgroundColor: '#0F172A',
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  primaryBtn: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  ghostBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ghostBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    alignItems: 'center',
    paddingTop: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOff: {
    opacity: 0.45,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  hint: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '42%',
    zIndex: 3,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(185,28,28,0.92)',
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default InAppCameraModal;
