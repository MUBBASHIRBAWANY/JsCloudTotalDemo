import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Row } from '@/hooks/useLoginUser';

const QUEUE_KEY = 'offlineOrderQueue.v1';

export type OfflineOrderItem = {
  id: string;
  payload: Row;
  distributorId: string;
  orderBookerId: string;
  enqueuedAt: string;
};

const readQueue = async (): Promise<OfflineOrderItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as OfflineOrderItem[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = async (items: OfflineOrderItem[]) => {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
};

/** Enqueue an order for later sync. Skips duplicate ids. */
export const enqueueOfflineOrder = async (item: OfflineOrderItem) => {
  const queue = await readQueue();
  if (queue.some((row) => row.id === item.id)) return;
  queue.push(item);
  await writeQueue(queue);
};

export const listOfflineOrders = readQueue;

/** Drop queue rows after the user successfully synced those order ids from Sync Data. */
export const removeOfflineOrdersByIds = async (ids: string[]) => {
  if (!ids.length) return;
  const drop = new Set(ids.filter(Boolean));
  const queue = await readQueue();
  const next = queue.filter((row) => !drop.has(row.id));
  if (next.length !== queue.length) await writeQueue(next);
};
