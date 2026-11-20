import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Office Wi‑Fi often blocks phone→PC (client isolation).
 * Same Wi‑Fi ≠ phone can reach your PC.
 *
 * When LAN fails:
 *   1) Keep backend tunnel up:  npx --yes localtunnel --port 3005
 *   2) Paste the HTTPS URL below
 *   3) Start Expo with tunnel:   npx expo start --tunnel
 */
const SND_TUNNEL_URL = 'https://orange-emus-end.loca.lt/';

/** Optional Cloud (:3001) tunnel — leave empty if unused */
const CLOUD_TUNNEL_URL = '';

/** LAN IP when phone can actually reach the PC (home Wi‑Fi, hotspot, etc.) */
const MANUAL_DEV_HOST = '192.168.10.40';

const isTunnelHost = (host) => {
  const h = String(host || '').toLowerCase();
  return (
    h.includes('exp.direct')
    || h.includes('exp.host')
    || h.includes('expo.app')
    || h.includes('ngrok')
    || h.includes('loca.lt')
    || h.includes('trycloudflare.com')
  );
};

const isUsableHost = (host) => {
  if (!host) return false;
  const h = String(host).trim();
  if (!h || h === 'localhost' || h === '127.0.0.1') return false;
  return true;
};

const hostFromExpo = () => {
  const hostUri =
    Constants.expoConfig?.hostUri
    || Constants.linkingUri
    || Constants.experienceUrl
    || '';
  const match = String(hostUri).match(/([^/:]+)(?::\d+)?/);
  return match?.[1] || '';
};

/**
 * Host for local backends. Prefer public tunnel on physical devices
 * when LAN is blocked (office AP isolation).
 */
export const devMachineHost = () => {
  if (Platform.OS === 'web') return 'localhost';

  const expoHost = hostFromExpo();
  // Expo Go tunnel / ngrok-style Metro → never use that host for API
  if (isTunnelHost(expoHost) || SND_TUNNEL_URL) {
    // API host resolved via sndApiBaseUrl / cloudApiBaseUrl
    return MANUAL_DEV_HOST || 'localhost';
  }

  if (isUsableHost(expoHost) && !isTunnelHost(expoHost)) {
    return expoHost;
  }

  return MANUAL_DEV_HOST || 'localhost';
};

const normalizeBase = (url) => {
  const u = String(url || '').trim();
  if (!u) return '';
  return u.endsWith('/') ? u : `${u}/`;
};

export const sndApiBaseUrl = (port = 3005) => {
  const tunnel = normalizeBase(SND_TUNNEL_URL);
  if (tunnel) return tunnel;
  return `http://${devMachineHost()}:${port}/`;
};

export const cloudApiBaseUrl = (port = 3001) => {
  const tunnel = normalizeBase(CLOUD_TUNNEL_URL);
  if (tunnel) return tunnel;
  return `http://${devMachineHost()}:${port}/`;
};

/** localtunnel interstitial bypass */
export const tunnelHeaders = () => {
  const base = sndApiBaseUrl();
  if (base.includes('loca.lt')) {
    return { 'Bypass-Tunnel-Reminder': 'true' };
  }
  return {};
};
 