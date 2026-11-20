import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createFormDataFunction, getDataFundtion } from './CurdFunctions';
import {
  createFormDataFunction as createSndForm,
  getDataFundtion as getSndData,
} from './SNDCurdFunctions';
import type { LoginServer } from '@/hooks/useLoginUser';

export type AttendanceImage = {
  filename: string;
  type: string;
  uri: string;
};

export type TodayAttendanceStatus = {
  checkedIn: boolean;
  checkedOut: boolean;
  date: string;
};

/** Local calendar date YYYY-MM-DD (not UTC). */
export const attendanceLocalDate = (value: Date = new Date()) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export type AttendanceMark = {
  userId: string;
  bookername: string;
  image: AttendanceImage;
  latitude: number;
  longitude: number;
  markingType: string;
  date: string;
  time: string;
  distributorId?: string;
  server?: LoginServer | null;
};

const imageName = (filename: string) => {
  const clean = filename.replace(/[^\w.\-]+/g, '_') || `attendance-${Date.now()}.jpg`;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(clean) ? clean : `${clean}.jpg`;
};

const appendImage = async (form: FormData, image: AttendanceImage) => {
  const name = imageName(image.filename);
  const type = image.type?.startsWith('image/') ? image.type.replace('image/jpg', 'image/jpeg') : 'image/jpeg';
  if (Platform.OS === 'web' || image.uri.startsWith('http')) {
    const response = await fetch(image.uri);
    const blob = await response.blob();
    form.append('image', blob, name);
    return;
  }
  form.append('image', {
    uri: image.uri,
    name,
    type,
  } as unknown as Blob);
};

export const fetchTodayAttendance = async (
  userId: string,
  server?: LoginServer | null,
): Promise<TodayAttendanceStatus> => {
  const date = attendanceLocalDate();
  const empty: TodayAttendanceStatus = { checkedIn: false, checkedOut: false, date };
  if (!userId) return empty;

  const stored = await AsyncStorage.getItem('LoginServer');
  const loginServer = server === 'snd' || server === 'cloud' ? server : stored;
  const token = await AsyncStorage.getItem('OrderBookerToken');
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const endpoint = `/Attandance/today?UserId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`;

  try {
    const response = loginServer === 'snd'
      ? await getSndData(endpoint, headers, true)
      : await getDataFundtion(endpoint, headers);
    return {
      checkedIn: Boolean(response?.checkedIn),
      checkedOut: Boolean(response?.checkedOut),
      date: typeof response?.date === 'string' && response.date ? response.date : date,
    };
  } catch {
    return empty;
  }
};

export const markAttendance = async (mark: AttendanceMark) => {
  const form = new FormData();
  form.append('longitude', String(mark.longitude));
  form.append('latitude', String(mark.latitude));
  form.append('uri', mark.image.uri);
  form.append('bookername', mark.bookername);
  form.append('UserId', mark.userId);
  form.append('orderBookerId', mark.userId);
  form.append('date', mark.date);
  form.append('time', mark.time);
  form.append('markingType', mark.markingType);
  if (mark.distributorId) form.append('distributorId', mark.distributorId);
  await appendImage(form, mark.image);

  const stored = await AsyncStorage.getItem('LoginServer');
  const server = mark.server === 'snd' || mark.server === 'cloud' ? mark.server : stored;
  const token = await AsyncStorage.getItem('OrderBookerToken');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    // quiet=true: API may return "You Allready check-in" — show in UI popup, not red console
    if (server === 'snd') return await createSndForm('/Attandance', form, headers, true);
    return await createFormDataFunction('/Attandance', form, headers, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '');
    const lower = message.toLowerCase();
    if (
      lower.includes('allready check-in')
      || lower.includes('already check-in')
      || lower.includes('allready check-out')
      || lower.includes('already check-out')
    ) {
      throw new Error(message);
    }
    throw error;
  }
};
