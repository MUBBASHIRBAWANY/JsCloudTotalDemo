import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type TrustedGeo = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export type TrustedLocationResult =
  | { ok: true; geo: TrustedGeo }
  | { ok: false; message: string };

const MAX_ACCURACY_METERS = 80;
const MAX_AGE_MS = 30_000;

/**
 * Reads the device GPS and rejects mock / developer fake locations.
 * Android: Location.mocked from mock-location apps.
 * Also rejects stale or very inaccurate fixes.
 */
export const getTrustedGpsLocation = async (): Promise<TrustedLocationResult> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return {
      ok: false,
      message: 'Allow location so this order records where it was taken.',
    };
  }

  const provider = await Location.getProviderStatusAsync();
  if (!provider.locationServicesEnabled) {
    return {
      ok: false,
      message: 'Turn on location / GPS in phone settings, then try again.',
    };
  }

  if (Platform.OS === 'android' && provider.gpsAvailable === false) {
    return {
      ok: false,
      message: 'GPS is not available. Turn off mock location and enable device GPS.',
    };
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
    mayShowUserSettingsDialog: true,
  });

  if (current.mocked === true) {
    return {
      ok: false,
      message:
        'Fake GPS detected. Turn off Developer Options mock location / fake GPS apps, then try again.',
    };
  }

  const ageMs = Date.now() - current.timestamp;
  if (Number.isFinite(ageMs) && ageMs > MAX_AGE_MS) {
    return {
      ok: false,
      message: 'GPS fix is too old. Move outdoors and capture again.',
    };
  }

  const { latitude, longitude, accuracy } = current.coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      ok: false,
      message: 'Could not read a valid GPS position. Try again outdoors.',
    };
  }

  if (accuracy != null && Number.isFinite(accuracy) && accuracy > MAX_ACCURACY_METERS) {
    return {
      ok: false,
      message: `GPS is weak (±${Math.round(accuracy)}m). Move outdoors and try again.`,
    };
  }

  return {
    ok: true,
    geo: {
      latitude,
      longitude,
      accuracy: accuracy == null || !Number.isFinite(accuracy) ? null : accuracy,
    },
  };
};
