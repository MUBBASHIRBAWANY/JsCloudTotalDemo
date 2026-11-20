import * as Location from 'expo-location';

export type CurrentCoords = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
};

const GPS_TIMEOUT_MS = 20_000;

/**
 * High-accuracy GPS fix for order create.
 * Never throws for the caller — returns null on deny / timeout / failure.
 */
export const getCurrentCoords = async (): Promise<CurrentCoords | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const position = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        mayShowUserSettingsDialog: true,
      }),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), GPS_TIMEOUT_MS);
      }),
    ]);

    if (!position) return null;

    const { latitude, longitude, accuracy } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return {
      latitude,
      longitude,
      accuracy: accuracy == null || !Number.isFinite(accuracy) ? null : accuracy,
      capturedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
};
