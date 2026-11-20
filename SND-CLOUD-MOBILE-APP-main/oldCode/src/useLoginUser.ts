import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers } from '../Redux/Reducer/userReduser';
import type { AppDispatch, RootState } from '../Redux/Store/types';
import { createDataFunction } from './Api/CurdFunctions';

export type LoginUser = {
  _id: string;
  Distributor?: string;
  distributor?: string;
  firstname?: string;
};

export type Row = Record<string, unknown> & { _id?: string; id?: string };

export const asList = (payload: unknown): Row[] => {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return [];
    try {
      return asList(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }
  if (Array.isArray(payload)) return payload as Row[];
  if (payload && typeof payload === 'object') {
    const record = payload as { data?: unknown; customers?: unknown };
    if (Array.isArray(record.data)) return record.data as Row[];
    if (Array.isArray(record.customers)) return record.customers as Row[];
    if (typeof record.customers === 'string') return asList(record.customers);
    if (typeof record.data === 'string') return asList(record.data);
  }
  return [];
};

export const textOf = (row: Row, keys: string[], fallback = '—') => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return fallback;
};

export const useLoginUser = () => {
  const dispatch = useDispatch<AppDispatch>();
  const loginVendor = useSelector((state: RootState) => state.users1.state) as LoginUser | null;

  useEffect(() => {
    const loadUser = async () => {
      if (loginVendor?._id) return;
      const token = await AsyncStorage.getItem('OrderBookerToken');
      if (!token) return;
      try {
        const response = await createDataFunction('/users/profile', { authorization: token });
        const user = response?.data?.val as LoginUser | undefined;
        if (user?._id) dispatch(fetchUsers(user));
      } catch (error) {
        console.error('Profile load failed:', error);
      }
    };
    loadUser();
  }, [dispatch, loginVendor?._id]);

  return {
    dispatch,
    loginVendor,
    distributorId: loginVendor?.Distributor || loginVendor?.distributor || '',
    orderBookerId: loginVendor?._id || '',
  };
};
