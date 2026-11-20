import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

const probe = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Quick online check.
 * Web: browser `navigator.onLine` / NetInfo — do NOT probe Google URLs (CORS → false offline).
 * Native: NetInfo first, then lightweight HTTPS probe.
 */
export const isOnline = async (timeoutMs = 3500): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    if (state.isConnected === false) return false;
    if (state.isInternetReachable === false) return false;
    if (state.isInternetReachable === true || state.isConnected === true) {
      if (Platform.OS === 'web') return true;
    }
  } catch {
    // Fall through.
  }

  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    // Assume online on web; actual API calls decide success/failure.
    return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  }

  try {
    return await probe('https://clients3.google.com/generate_204', timeoutMs);
  } catch {
    try {
      return await probe('https://www.gstatic.com/generate_204', timeoutMs);
    } catch {
      return false;
    }
  }
};
