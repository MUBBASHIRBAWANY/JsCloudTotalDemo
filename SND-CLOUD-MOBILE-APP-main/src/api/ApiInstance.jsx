import { create } from 'axios';
import { Platform } from 'react-native';
import { cloudApiBaseUrl } from './devHost';

const baseURL = cloudApiBaseUrl(3001);
// const baseURL = `https://pdl1.online/`;

if (__DEV__) {
  console.log(`[Cloud API] ${baseURL} (${Platform.OS})`);
}

export const api = create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const Cloudapi = create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
