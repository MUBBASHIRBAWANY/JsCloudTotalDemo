import { getDataFundtion as getSndData } from '@/api/SNDCurdFunctions';
import { asList, type Row } from '@/hooks/useLoginUser';

export type ZsmShop = {
  shopId: string;
  shopName: string;
  ownerName: string;
  city: string;
  code: string;
};

export type ZsmBooker = {
  orderBookerId: string;
  orderBookerName: string;
  loginId: string;
  code: string;
  shopCount: number;
  shops: ZsmShop[];
};

export type ZsmTsmNode = {
  tsmId: string;
  tsmName: string;
  vendorCount: number;
  orderBookerCount: number;
  orderBookers: ZsmBooker[];
};

export type ZsmDistributorNode = {
  distributorId: string;
  distributorName: string;
  systemCode: string;
  city: string;
  missing?: boolean;
  tsmCount: number;
  orderBookerCount: number;
  shopCount: number;
  tsms: ZsmTsmNode[];
};

export type ZsmHierarchy = {
  zsmUserId: string;
  zsmName: string;
  vendorCount: number;
  summary: {
    distributors: number;
    tsms: number;
    orderBookers: number;
    shops: number;
  };
  distributors: ZsmDistributorNode[];
};

const emptySummary = () => ({
  distributors: 0,
  tsms: 0,
  orderBookers: 0,
  shops: 0,
});

export const emptyZsmHierarchy = (userId = ''): ZsmHierarchy => ({
  zsmUserId: userId,
  zsmName: '',
  vendorCount: 0,
  summary: emptySummary(),
  distributors: [],
});

const asShop = (row: Row): ZsmShop => ({
  shopId: String(row.shopId || row._id || ''),
  shopName: String(row.shopName || row.DistrbutorName || 'Shop'),
  ownerName: String(row.ownerName || row.OwnerName || ''),
  city: String(row.city || row.City || ''),
  code: String(row.code || row.DistrbutorSystemCode || ''),
});

const asBooker = (row: Row): ZsmBooker => ({
  orderBookerId: String(row.orderBookerId || row._id || ''),
  orderBookerName: String(row.orderBookerName || row.OrderBookerName || 'Order booker'),
  loginId: String(row.loginId || row.OrderBookerID || ''),
  code: String(row.code || ''),
  shopCount: Number(row.shopCount) || asList(row.shops).length,
  shops: asList(row.shops).map(asShop),
});

const asTsm = (row: Row): ZsmTsmNode => ({
  tsmId: String(row.tsmId || row._id || ''),
  tsmName: String(row.tsmName || row.firstname || 'TSM'),
  vendorCount: Number(row.vendorCount) || 0,
  orderBookerCount: Number(row.orderBookerCount) || asList(row.orderBookers).length,
  orderBookers: asList(row.orderBookers).map(asBooker),
});

const asDistributor = (row: Row): ZsmDistributorNode => ({
  distributorId: String(row.distributorId || row._id || ''),
  distributorName: String(row.distributorName || row.DistrbutorName || 'Distributor'),
  systemCode: String(row.systemCode || row.DistrbutorSystemCode || ''),
  city: String(row.city || row.City || ''),
  missing: row.missing === true,
  tsmCount: Number(row.tsmCount) || asList(row.tsms).length,
  orderBookerCount: Number(row.orderBookerCount) || 0,
  shopCount: Number(row.shopCount) || 0,
  tsms: asList(row.tsms).map(asTsm),
});

export const fetchZsmHierarchy = async (userId: string) => {
  const id = String(userId || '').trim();
  if (!id) throw new Error('ZSM user id missing. Log in again.');
  const payload = await getSndData(`/users/zsmHierarchy/${encodeURIComponent(id)}`, undefined, true);
  const root = payload && typeof payload === 'object' ? (payload as Row & { data?: unknown }) : {};
  const data = root.data && typeof root.data === 'object' && !Array.isArray(root.data)
    ? (root.data as Row)
    : root;
  const distributors = asList(data.distributors).map(asDistributor);
  const summaryRow = data.summary && typeof data.summary === 'object'
    ? (data.summary as Row)
    : {};
  return {
    zsmUserId: String(data.zsmUserId || id),
    zsmName: String(data.zsmName || ''),
    vendorCount: Number(data.vendorCount) || distributors.length,
    summary: {
      distributors: Number(summaryRow.distributors) || distributors.length,
      tsms: Number(summaryRow.tsms) || distributors.reduce((sum, row) => sum + row.tsmCount, 0),
      orderBookers:
        Number(summaryRow.orderBookers)
        || distributors.reduce((sum, row) => sum + row.orderBookerCount, 0),
      shops: Number(summaryRow.shops) || distributors.reduce((sum, row) => sum + row.shopCount, 0),
    },
    distributors,
  } satisfies ZsmHierarchy;
};
