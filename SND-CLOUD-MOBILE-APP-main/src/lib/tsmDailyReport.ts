import { getDataFundtion as getSndData } from '@/api/SNDCurdFunctions';
import { asList, type Row } from '@/hooks/useLoginUser';

export type TsmActivityStatus = 'order' | 'visit' | 'nothing';

export type TsmReportRow = {
  customerId: string;
  shopName: string;
  shopOwner: string;
  date: string;
  status: TsmActivityStatus;
  visit: boolean;
  saleOrderNumber: string;
  orderId: string;
};

export type TsmReportBooker = {
  orderBookerId: string;
  orderBookerName: string;
  loginId: string;
  code: string;
  summary: {
    customers: number;
    order: number;
    visit: number;
    nothing: number;
  };
  rows: TsmReportRow[];
};

export type TsmDailyReport = {
  date: string;
  distributorId: string;
  summary: {
    bookers: number;
    customers: number;
    order: number;
    visit: number;
    nothing: number;
  };
  bookers: TsmReportBooker[];
};

const asStatus = (value: unknown): TsmActivityStatus => {
  const status = String(value || '').toLowerCase();
  if (status === 'order' || status === 'visit' || status === 'nothing') return status;
  return 'nothing';
};

const asSummary = (value: unknown) => {
  const row = value && typeof value === 'object' ? (value as Row) : {};
  return {
    customers: Number(row.customers) || 0,
    order: Number(row.order) || 0,
    visit: Number(row.visit) || 0,
    nothing: Number(row.nothing) || 0,
  };
};

const normalizeReport = (payload: unknown, fallbackDate: string, distributorId: string): TsmDailyReport => {
  const root = payload && typeof payload === 'object' ? (payload as Row & { data?: unknown }) : {};
  const data = root.data && typeof root.data === 'object' && !Array.isArray(root.data)
    ? (root.data as Row)
    : root;

  const bookers = asList(data.bookers).map((booker) => {
    const rows = asList(booker.rows).map((row) => ({
      customerId: String(row.customerId || row._id || ''),
      shopName: String(row.shopName || row.CustomorName || 'Shop'),
      shopOwner: String(row.shopOwner || row.ShopOwner || ''),
      date: String(row.date || data.date || fallbackDate),
      status: asStatus(row.status),
      visit: row.visit === true,
      saleOrderNumber: String(row.saleOrderNumber || ''),
      orderId: String(row.orderId || ''),
    }));
    return {
      orderBookerId: String(booker.orderBookerId || booker._id || ''),
      orderBookerName: String(booker.orderBookerName || booker.OrderBookerName || 'Order booker'),
      loginId: String(booker.loginId || booker.LoginId || ''),
      code: String(booker.code || ''),
      summary: asSummary(booker.summary),
      rows,
    };
  });

  const summaryRaw = asSummary(data.summary);
  return {
    date: String(data.date || fallbackDate),
    distributorId: String(data.distributorId || distributorId),
    summary: {
      ...summaryRaw,
      bookers: Number((data.summary as Row | undefined)?.bookers) || bookers.length,
    },
    bookers,
  };
};

export const emptyTsmDailyReport = (date: string, distributorId = ''): TsmDailyReport => ({
  date,
  distributorId,
  summary: { bookers: 0, customers: 0, order: 0, visit: 0, nothing: 0 },
  bookers: [],
});

export const fetchTsmDailyReport = async (distributorId: string, date: string) => {
  const distId = String(distributorId || '').trim();
  const day = String(date || '').trim().slice(0, 10);
  if (!distId) throw new Error('No distributor on this TSM account.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid report date.');

  const payload = await getSndData(
    `/saleOrder/tsmDailyReport?Distributor=${encodeURIComponent(distId)}&date=${encodeURIComponent(day)}`,
    undefined,
    true,
  );
  return normalizeReport(payload, day, distId);
};

export const statusLabel = (status: TsmActivityStatus) => {
  if (status === 'order') return 'Order';
  if (status === 'visit') return 'Visit only';
  return 'Nothing';
};
