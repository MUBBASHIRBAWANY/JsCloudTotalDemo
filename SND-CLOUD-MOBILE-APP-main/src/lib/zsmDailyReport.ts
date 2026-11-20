import { getDataFundtion as getSndData } from '@/api/SNDCurdFunctions';
import { asList, type Row } from '@/hooks/useLoginUser';
import {
  emptyTsmDailyReport,
  statusLabel,
  type TsmActivityStatus,
  type TsmReportBooker,
} from '@/lib/tsmDailyReport';

export type ZsmTsmVisit = {
  orderId: string;
  customerId: string;
  shopName: string;
  shopOwner: string;
  date: string;
  saleOrderNumber: string;
  remarks: string;
  status: 'visit';
};

export type ZsmReportTsm = {
  tsmId: string;
  tsmName: string;
  visitCount: number;
  visits: ZsmTsmVisit[];
};

export type ZsmReportDistributor = {
  distributorId: string;
  distributorName: string;
  systemCode: string;
  missing?: boolean;
  summary: {
    tsms: number;
    tsmVisits: number;
    bookers: number;
    customers: number;
    order: number;
    visit: number;
    nothing: number;
  };
  tsms: ZsmReportTsm[];
  bookers: TsmReportBooker[];
};

export type ZsmDailyReport = {
  date: string;
  zsmUserId: string;
  zsmName: string;
  vendorCount: number;
  summary: {
    distributors: number;
    tsms: number;
    tsmVisits: number;
    bookers: number;
    customers: number;
    order: number;
    visit: number;
    nothing: number;
  };
  distributors: ZsmReportDistributor[];
};

const asStatus = (value: unknown): TsmActivityStatus => {
  const status = String(value || '').toLowerCase();
  if (status === 'order' || status === 'visit' || status === 'nothing') return status;
  return 'nothing';
};

const asBooker = (booker: Row): TsmReportBooker => {
  const rows = asList(booker.rows).map((row) => ({
    customerId: String(row.customerId || row._id || ''),
    shopName: String(row.shopName || row.CustomorName || 'Shop'),
    shopOwner: String(row.shopOwner || row.ShopOwner || ''),
    date: String(row.date || ''),
    status: asStatus(row.status),
    visit: row.visit === true,
    saleOrderNumber: String(row.saleOrderNumber || ''),
    orderId: String(row.orderId || ''),
  }));
  const summaryRow = booker.summary && typeof booker.summary === 'object'
    ? (booker.summary as Row)
    : {};
  return {
    orderBookerId: String(booker.orderBookerId || booker._id || ''),
    orderBookerName: String(booker.orderBookerName || booker.OrderBookerName || 'Order booker'),
    loginId: String(booker.loginId || booker.LoginId || ''),
    code: String(booker.code || ''),
    summary: {
      customers: Number(summaryRow.customers) || rows.length,
      order: Number(summaryRow.order) || 0,
      visit: Number(summaryRow.visit) || 0,
      nothing: Number(summaryRow.nothing) || 0,
    },
    rows,
  };
};

const asDistributor = (row: Row): ZsmReportDistributor => {
  const summaryRow = row.summary && typeof row.summary === 'object' ? (row.summary as Row) : {};
  const tsms = asList(row.tsms).map((tsm) => ({
    tsmId: String(tsm.tsmId || tsm._id || ''),
    tsmName: String(tsm.tsmName || tsm.firstname || 'TSM'),
    visitCount: Number(tsm.visitCount) || asList(tsm.visits).length,
    visits: asList(tsm.visits).map((visit) => ({
      orderId: String(visit.orderId || visit._id || ''),
      customerId: String(visit.customerId || ''),
      shopName: String(visit.shopName || 'Shop'),
      shopOwner: String(visit.shopOwner || ''),
      date: String(visit.date || ''),
      saleOrderNumber: String(visit.saleOrderNumber || ''),
      remarks: String(visit.remarks || ''),
      status: 'visit' as const,
    })),
  }));
  return {
    distributorId: String(row.distributorId || row._id || ''),
    distributorName: String(row.distributorName || row.DistrbutorName || 'Distributor'),
    systemCode: String(row.systemCode || ''),
    missing: row.missing === true,
    summary: {
      tsms: Number(summaryRow.tsms) || tsms.length,
      tsmVisits: Number(summaryRow.tsmVisits) || tsms.reduce((sum, item) => sum + item.visitCount, 0),
      bookers: Number(summaryRow.bookers) || asList(row.bookers).length,
      customers: Number(summaryRow.customers) || 0,
      order: Number(summaryRow.order) || 0,
      visit: Number(summaryRow.visit) || 0,
      nothing: Number(summaryRow.nothing) || 0,
    },
    tsms,
    bookers: asList(row.bookers).map(asBooker),
  };
};

export const emptyZsmDailyReport = (date: string, userId = ''): ZsmDailyReport => ({
  date,
  zsmUserId: userId,
  zsmName: '',
  vendorCount: 0,
  summary: {
    distributors: 0,
    tsms: 0,
    tsmVisits: 0,
    bookers: 0,
    customers: 0,
    order: 0,
    visit: 0,
    nothing: 0,
  },
  distributors: [],
});

export const fetchZsmDailyReport = async (userId: string, date: string) => {
  const id = String(userId || '').trim();
  const day = String(date || '').trim().slice(0, 10);
  if (!id) throw new Error('ZSM user id missing. Log in again.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid report date.');

  const payload = await getSndData(
    `/saleOrder/zsmDailyReport?userId=${encodeURIComponent(id)}&date=${encodeURIComponent(day)}`,
    undefined,
    true,
  );
  const root = payload && typeof payload === 'object' ? (payload as Row & { data?: unknown }) : {};
  const data = root.data && typeof root.data === 'object' && !Array.isArray(root.data)
    ? (root.data as Row)
    : root;
  const distributors = asList(data.distributors).map(asDistributor);
  const summaryRow = data.summary && typeof data.summary === 'object' ? (data.summary as Row) : {};
  return {
    date: String(data.date || day),
    zsmUserId: String(data.zsmUserId || id),
    zsmName: String(data.zsmName || ''),
    vendorCount: Number(data.vendorCount) || distributors.length,
    summary: {
      distributors: Number(summaryRow.distributors) || distributors.length,
      tsms: Number(summaryRow.tsms) || 0,
      tsmVisits: Number(summaryRow.tsmVisits) || 0,
      bookers: Number(summaryRow.bookers) || 0,
      customers: Number(summaryRow.customers) || 0,
      order: Number(summaryRow.order) || 0,
      visit: Number(summaryRow.visit) || 0,
      nothing: Number(summaryRow.nothing) || 0,
    },
    distributors,
  } satisfies ZsmDailyReport;
};

export { emptyTsmDailyReport, statusLabel };
export type { TsmActivityStatus, TsmReportBooker };
