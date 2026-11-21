import { create } from 'axios';
import { Platform } from 'react-native';

const baseURL = 'https://jsnddemo.jspro4.tech/';
const cloudURL = 'https://jsdemo.jspro4.tech/';

if (__DEV__) {
  console.log(`[SND API] ${baseURL} (${Platform.OS})`);
}

export const SNDAPI = create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const Cloudapi = create({
  baseURL: cloudURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default SNDAPI;
