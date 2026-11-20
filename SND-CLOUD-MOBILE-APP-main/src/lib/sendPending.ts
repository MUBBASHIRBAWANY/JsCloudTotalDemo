import { createDataFunction } from '@/api/CurdFunctions';
import { getDataFundtion as getSndData, createDataFunction as createSndData } from '@/api/SNDCurdFunctions';
import { asList, textOf, type Row } from '@/hooks/useLoginUser';
import { nextCustomerCode } from '@/lib/customerForm';
import { postPendingOrder } from '@/lib/distributorSaleOrder';
import { removeOfflineOrdersByIds } from '@/lib/offlineOrderQueue';
import { updateSaleOrder, removeSaleOrder } from '@/redux/Reducer/SaleOrderReducer';
import { fetchDistributor } from '@/redux/Reducer/shopsReducer';
import type { AppDispatch } from '@/redux/Store/types';

const partyKeys = ['Customer', 'Distrbutor', 'Distributor'] as const;
const skipKeys = new Set(['_id', 'id', 'pendingCustomer', 'loginServer', 'sumAging', 'PriceList']);

const lastCodeOf = (payload: unknown) => {
  if (!payload || typeof payload !== 'object' || !('data' in payload)) return '';
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== 'object' || !('code' in data)) return '';
  const code = (data as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
};

const rowOf = (payload: unknown): Row | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const record = payload as Row & { data?: unknown };
  if (record._id) {
    const safe = { ...record };
    delete safe.Password;
    delete safe.pendingCustomer;
    return safe;
  }
  if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
    return rowOf(record.data);
  }
  return null;
};

const sameCustomer = (row: Row | null, name: string, nic: string) => {
  if (!row?._id) return false;
  if (textOf(row, ['CustomorName'], '').toLowerCase() !== name) return false;
  const rowNic = textOf(row, ['OwnerCnic'], '');
  return !nic || !rowNic || rowNic === nic;
};

const sendStoredCustomer = async (row: Row) => {
  const body: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    if (skipKeys.has(key) || typeof value !== 'string') continue;
    body[key] = value;
  }
  if (row.loginServer === 'snd') {
    body.code = nextCustomerCode(lastCodeOf(await getSndData('/Customor/lastCutomer')));
    await createSndData('/Customor', body);
    const name = (body.CustomorName || '').trim().toLowerCase();
    const nic = (body.OwnerCnic || '').trim();
    const latest = rowOf(await getSndData('/Customor/lastCutomer'));
    if (sameCustomer(latest, name, nic)) return latest as Row;
    if (body.Distributor) {
      const found = asList(await getSndData(`/Customor/AllCutomerByDis/${body.Distributor}`))
        .find((item) => sameCustomer(item, name, nic));
      if (found?._id) return found;
    }
    throw new Error('Customer send could not be confirmed. It is still saved on this phone.');
  }
  const created = rowOf(await createDataFunction('/Distrbutor', body));
  if (!created?._id) throw new Error('Customer send did not return an id. It is still saved on this phone.');
  return created;
};

const withServerParty = (order: Row, fromId: string, toId: string) => {
  let changed = false;
  const next: Row = { ...order };
  for (const key of partyKeys) {
    if (String(order[key] || '') === fromId) {
      next[key] = toId;
      changed = true;
    }
  }
  return changed ? next : order;
};

export type SendPendingResult = {
  dates: string[];
};

/** Sends unsent customers first, then pending orders. A failure leaves the rest on the phone. */
export async function sendPendingData(args: {
  dispatch: AppDispatch;
  customers: Row[];
  orders: Row[];
  distributorId: string;
  orderBookerId: string;
}) {
  let customers = args.customers.map((row) => ({ ...row }));
  let orders = args.orders.map((row) => ({ ...row }));
  for (const customer of customers) {
    if (customer.pendingCustomer !== true || !customer._id) continue;
    const localId = String(customer._id);
    const serverRow = await sendStoredCustomer(customer);
    const serverId = String(serverRow._id);
    customers = customers.map((row) => (
      String(row._id) === localId
        ? { ...serverRow, sumAging: serverRow.sumAging ?? customer.sumAging ?? 0 }
        : row
    ));
    args.dispatch(fetchDistributor(customers));
    orders = orders.map((order) => {
      const next = withServerParty(order, localId, serverId);
      if (next !== order && next.id) args.dispatch(updateSaleOrder(next));
      return next;
    });
  }
  const dates: string[] = [];
  const syncedOrderIds: string[] = [];
  for (const order of orders) {
    const sent = await postPendingOrder(order, {
      distributorId: args.distributorId,
      orderBookerId: args.orderBookerId,
      parties: customers,
    });
    if (sent.saleOrderDate && !dates.includes(sent.saleOrderDate)) dates.push(sent.saleOrderDate);
    if (order.id) {
      const id = String(order.id);
      args.dispatch(removeSaleOrder(id));
      syncedOrderIds.push(id);
    }
  }
  // Only clear phone queue after user-triggered Sync Data succeeds — never on reconnect.
  if (syncedOrderIds.length) await removeOfflineOrdersByIds(syncedOrderIds);
  return { dates };
}
