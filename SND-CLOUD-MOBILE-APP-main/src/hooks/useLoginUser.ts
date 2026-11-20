import { api } from '@/api/ApiInstance';
import { SNDAPI } from '@/api/SNDApiInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers } from '@/redux/Reducer/userReduser';
import type { AppDispatch, RootState } from '@/redux/Store/types';

export type LoginServer = 'snd' | 'cloud';
export type LoginRole = 'orderbooker' | 'tsm' | 'zsm';
export type RoleHomePath = '/tsm-home' | '/zsm-home' | '/home';

export type LoginUser = {
  _id: string;
  Distributor?: string;
  distributor?: string;
  Vendor?: unknown;
  firstname?: string;
  lastname?: string;
  OrderBookerName?: string;
  loginServer?: LoginServer;
  loginRole?: LoginRole;
  vendorCount?: number;
};

export const normalizeLoginRole = (role?: string | null) =>
  String(role || '').trim().toLowerCase();

export const isTsmRole = (role?: string | null) => normalizeLoginRole(role) === 'tsm';

export const isZsmRole = (role?: string | null) => normalizeLoginRole(role) === 'zsm';

/** Landing screen after login / attendance / sync for this role. */
export const roleHomePath = (role?: string | null): RoleHomePath => {
  if (isTsmRole(role)) return '/tsm-home';
  if (isZsmRole(role)) return '/zsm-home';
  return '/home';
};

/** Vendor[] entries are distributor ids. */
export const collectVendorIds = (user?: Partial<LoginUser> | null) => {
  const ids: string[] = [];
  const push = (value: unknown) => {
    const id = value && typeof value === 'object'
      ? String((value as { _id?: string; id?: string })._id || (value as { id?: string }).id || '').trim()
      : String(value || '').trim();
    if (id && !ids.includes(id)) ids.push(id);
  };
  push(user?.distributor);
  push(user?.Distributor);
  const vendors = Array.isArray(user?.Vendor) ? user.Vendor : [];
  vendors.forEach(push);
  return ids;
};

/** Prefer Distributor, then distributor, then first Vendor id. */
export const resolveDistributorId = (user?: Partial<LoginUser> | null) =>
  collectVendorIds(user)[0] || '';

export const partyNameKeys = (server?: LoginServer | null) =>
  server === 'snd'
    ? ['CustomerName', 'CustomorName', 'customerName', 'DistrbutorName']
    : ['DistrbutorName', 'OwnerName', 'code'];

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

export const textOf = (row: Row | null | undefined, keys: string[], fallback = '—') => {
  if (!row || typeof row !== 'object') return fallback;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return fallback;
};

const LOGIN_NAME = 'LoginName';
const LOGIN_USER = 'LoginUser';
const LOGIN_ROLE = 'LoginRole';
const MUST_CHANGE_PASSWORD = 'MustChangePassword';

const asLoginRole = (value: unknown): LoginRole | null => {
  const role = normalizeLoginRole(typeof value === 'string' ? value : '');
  if (role === 'tsm' || role === 'zsm' || role === 'orderbooker') return role;
  return null;
};

export const DEFAULT_OTP_PASSWORD = '123';

export const setMustChangePassword = async (required: boolean) => {
  if (required) {
    await AsyncStorage.setItem(MUST_CHANGE_PASSWORD, '1');
    return;
  }
  await AsyncStorage.removeItem(MUST_CHANGE_PASSWORD);
};

export const readMustChangePassword = async () =>
  (await AsyncStorage.getItem(MUST_CHANGE_PASSWORD)) === '1';

export const clearMustChangePassword = async () => {
  await AsyncStorage.removeItem(MUST_CHANGE_PASSWORD);
};
const VERIFY_TIMEOUT = 4000;

const responseStatus = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  const response = (error as { response?: { status?: number } }).response;
  return response?.status;
};

export const loginDisplayName = (user?: Partial<LoginUser> | null, fallback = '') =>
  user?.OrderBookerName?.trim() || user?.firstname?.trim() || fallback.trim();

const decodeBase64 = (value: string) => {
  if (typeof globalThis.atob !== 'function') return '';
  return globalThis.atob(value);
};

/** The login JWT payload is { val: orderBooker }. Offline sessions read that payload. */
const userFromToken = (token: string): Partial<LoginUser> | null => {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = decodeBase64(padded);
    if (!binary) return null;
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { val?: Partial<LoginUser> };
    if (parsed.val && typeof parsed.val === 'object') return parsed.val;
    return parsed as Partial<LoginUser>;
  } catch {
    return null;
  }
};

const readSavedUser = async (): Promise<LoginUser | null> => {
  const raw = await AsyncStorage.getItem(LOGIN_USER);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LoginUser;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const profileUser = (payload: unknown): LoginUser | undefined => {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as LoginUser & { val?: LoginUser };
  const user = record.val && typeof record.val === 'object' ? record.val : record;
  return user._id ? user : undefined;
};

const readSavedRole = async (): Promise<LoginRole | null> => {
  const fromKey = asLoginRole(await AsyncStorage.getItem(LOGIN_ROLE));
  if (fromKey) return fromKey;
  const saved = await readSavedUser();
  return asLoginRole(saved?.loginRole);
};

const offlineUser = async (token: string, loginServer: LoginServer): Promise<LoginUser | undefined> => {
  const saved = await readSavedUser();
  const fromToken = userFromToken(token);
  const savedRole = await readSavedRole();
  const savedName = (await AsyncStorage.getItem(LOGIN_NAME))?.trim() || '';
  const name = loginDisplayName(fromToken, loginDisplayName(saved, savedName));
  const id = String(fromToken?._id || saved?._id || '');
  if (!id && !name) return undefined;
  return {
    ...(saved ?? { _id: id }),
    ...(fromToken ?? {}),
    _id: id,
    loginServer,
    loginRole: asLoginRole(fromToken?.loginRole) || asLoginRole(saved?.loginRole) || savedRole || undefined,
    OrderBookerName: fromToken?.OrderBookerName || saved?.OrderBookerName || name,
    firstname: fromToken?.firstname || saved?.firstname || name,
    Distributor: (fromToken?.Distributor || saved?.Distributor || '') as string,
    distributor: (fromToken?.distributor || saved?.distributor || '') as string,
  };
};

export const saveLoginSession = async (user: LoginUser, token: string, server: LoginServer) => {
  const name = loginDisplayName(user);
  const role = asLoginRole(user.loginRole) || 'orderbooker';
  const stored: LoginUser = {
    ...user,
    loginServer: server,
    loginRole: role,
    OrderBookerName: user.OrderBookerName?.trim() || name,
    firstname: user.firstname?.trim() || name,
  };
  const pairs: [string, string][] = [
    ['LoginServer', server],
    [LOGIN_ROLE, role],
    [LOGIN_NAME, name],
    [LOGIN_USER, JSON.stringify(stored)],
  ];
  if (token) pairs.unshift(['OrderBookerToken', token]);
  await AsyncStorage.multiSet(pairs);
  return stored;
};

export const clearLoginSession = async () => {
  await AsyncStorage.multiRemove([
    'OrderBookerToken',
    LOGIN_NAME,
    LOGIN_USER,
    LOGIN_ROLE,
    MUST_CHANGE_PASSWORD,
  ]);
};

export type StoredSession =
  | { status: 'none' }
  | { status: 'expired' }
  | { status: 'ok'; user?: LoginUser; loginServer: LoginServer; offline?: boolean };

/** Online: ask the server that issued the token. Offline or unreachable: keep the saved token and name. */
export const readStoredSession = async (): Promise<StoredSession> => {
  const token = await AsyncStorage.getItem('OrderBookerToken');
  if (!token) return { status: 'none' };

  const storedServer = await AsyncStorage.getItem('LoginServer');
  const loginServer: LoginServer = storedServer === 'snd' ? 'snd' : 'cloud';
  try {
    const response = loginServer === 'snd'
      ? await SNDAPI.post('/OrderBooker/OrderBookerProfile', { authorization: token }, { timeout: VERIFY_TIMEOUT })
      : await api.post('/DitriButorOrderBooker/profile', { authorization: token }, { timeout: VERIFY_TIMEOUT });
    const verified = profileUser((response.data as { data?: unknown } | undefined)?.data);
    const savedRole = await readSavedRole();
    const savedUser = await readSavedUser();
    const user = verified?._id
      ? {
        ...savedUser,
        ...verified,
        loginServer,
        // Profile APIs do not always return loginRole — keep the role chosen at login.
        loginRole:
          asLoginRole(verified.loginRole)
          || asLoginRole(savedUser?.loginRole)
          || savedRole
          || undefined,
        OrderBookerName: verified.OrderBookerName?.trim() || loginDisplayName(verified),
        firstname: verified.firstname?.trim() || loginDisplayName(verified),
      }
      : await offlineUser(token, loginServer);
    if (user?._id || loginDisplayName(user)) {
      await AsyncStorage.setItem(LOGIN_NAME, loginDisplayName(user));
      if (user?.loginRole) await AsyncStorage.setItem(LOGIN_ROLE, user.loginRole);
      if (user) await AsyncStorage.setItem(LOGIN_USER, JSON.stringify(user));
    }
    return { status: 'ok', loginServer, user, offline: false };
  } catch (error) {
    const status = responseStatus(error);
    if (status === 401 || status === 403) {
      await clearLoginSession();
      return { status: 'expired' };
    }
    // Network / server down: stay logged in with phone-stored user + Redux Persist data.
    return {
      status: 'ok',
      loginServer,
      user: await offlineUser(token, loginServer),
      offline: true,
    };
  }
};

export const useLoginUser = () => {
  const dispatch = useDispatch<AppDispatch>();
  const loginVendor = useSelector((state: RootState) => state.users1.state) as LoginUser | null;
  const [loginServer, setLoginServer] = useState<LoginServer | null>(loginVendor?.loginServer ?? null);

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      const storedServer = await AsyncStorage.getItem('LoginServer');
      const server: LoginServer | null = storedServer === 'snd' || storedServer === 'cloud' ? storedServer : null;
      if (active && server) setLoginServer(server);
      if (loginVendor?._id) {
        if (server && loginVendor.loginServer !== server) {
          dispatch(fetchUsers({ ...loginVendor, loginServer: server }));
        }
        return;
      }
      try {
        const session = await readStoredSession();
        if (!active) return;
        if (session.status === 'ok') setLoginServer(session.loginServer);
        if (session.status === 'ok' && session.user?._id) dispatch(fetchUsers(session.user));
      } catch {
        // Keep any already-loaded user if profile refresh fails.
      }
    };
    void loadUser();
    return () => {
      active = false;
    };
  }, [dispatch, loginVendor]);

  return {
    dispatch,
    loginVendor,
    loginServer: loginServer ?? loginVendor?.loginServer ?? null,
    loginRole: loginVendor?.loginRole ?? null,
    distributorId: resolveDistributorId(loginVendor),
    orderBookerId: loginVendor?._id || '',
  };
};
