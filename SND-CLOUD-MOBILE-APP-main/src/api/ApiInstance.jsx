import { create } from 'axios';
import { Platform } from 'react-native';

const baseURL = 'https://jsdemo.jspro4.tech/';

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
