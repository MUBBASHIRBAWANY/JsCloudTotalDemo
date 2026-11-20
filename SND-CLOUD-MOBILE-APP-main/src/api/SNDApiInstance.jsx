import { create } from 'axios';
import { Platform } from 'react-native';
import { sndApiBaseUrl, tunnelHeaders } from './devHost';

const baseURL = sndApiBaseUrl(3005);
// const baseURL = 'https://api.pdl1.online/'

if (__DEV__) {
  console.log(`[SND API] ${baseURL} (${Platform.OS})`);
}

export const SNDAPI = create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    ...tunnelHeaders(),
  },
});

export const Cloudapi = create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    ...tunnelHeaders(),
  },
});

export default SNDAPI;
