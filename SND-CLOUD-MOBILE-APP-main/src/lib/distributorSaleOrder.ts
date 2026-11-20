import { createDataFunction, createFormDataFunction } from '@/api/CurdFunctions';
import { createFormDataFunction as createSndForm } from '@/api/SNDCurdFunctions';
import type { Row } from '@/hooks/useLoginUser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type ProductRef = {
  _id?: string;
  ProductName?: string;
  BoxinCarton?: number | string;
  PcsinBox?: number | string;
  TPSale?: number | string;
  RetailPrice?: number | string;
  SaleTaxBy?: number | string;
  SaleTaxPercent?: number | string;
  isForSND?: string | boolean;
  mastercode?: string;
  code?: string;
  /** Set on SND login for in-stock products only. */
  TotalQuantity?: number | string;
};

export type OrderLine = {
  id: string;
  product: string;
  productName: string;
  carton: string;
  box: string;
  Rate: number;
  unit: number;
  GrossAmount: number;
  netAmunt: number;
  Gst: number;
  totalBox: number;
  discount: number;
  AfterTaxdiscount: number;
  ValueAfterDiscout: number;
};

const amount = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

export const money = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : '0.00');

export const isSndProduct = (product: ProductRef) => {
  const flag = product.isForSND;
  if (flag === true) return true;
  return typeof flag === 'string' && flag.trim().toLowerCase() === 'true';
};

export const emptyLine = (): OrderLine => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  product: '',
  productName: '',
  carton: '',
  box: '',
  Rate: 0,
  unit: 0,
  GrossAmount: 0,
  netAmunt: 0,
  Gst: 0,
  totalBox: 0,
  discount: 0,
  AfterTaxdiscount: 0,
  ValueAfterDiscout: 0,
});

export const lineFromProduct = (product: ProductRef, id = emptyLine().id): OrderLine => ({
  ...emptyLine(),
  id,
  product: String(product._id || ''),
  productName: String(product.ProductName || ''),
  Rate: amount(product.TPSale),
});

export const recalcLine = (line: OrderLine, product: ProductRef | undefined): OrderLine => {
  if (!product) {
    return { ...line, unit: 0, totalBox: 0, GrossAmount: 0, netAmunt: 0, Gst: 0, ValueAfterDiscout: 0 };
  }
  const pcsInBox = amount(product.PcsinBox);
  const unitsPerCarton = amount(product.BoxinCarton) * pcsInBox;
  const box = Math.trunc(amount(line.box));
  const carton = Math.trunc(amount(line.carton));
  let unit = 0;
  if (box === 0) unit = unitsPerCarton * carton;
  else if (carton === 0) unit = pcsInBox * box;
  else unit = unitsPerCarton * carton + pcsInBox * box;

  const totalBox = pcsInBox > 0 ? unit / pcsInBox : 0;
  const gross = totalBox * amount(line.Rate);
  const discount = amount(line.discount);
  const afterDiscount = gross - discount;
  const retailValue = amount(product.RetailPrice) * totalBox;
  const taxPercent = amount(product.SaleTaxPercent);
  const gst = amount(product.SaleTaxBy) === 2
    ? (retailValue / 100) * taxPercent
    : (gross / 100) * taxPercent - discount;
  const net = gst + afterDiscount - amount(line.AfterTaxdiscount);
  return {
    ...line,
    unit,
    totalBox,
    GrossAmount: gross,
    ValueAfterDiscout: afterDiscount,
    Gst: gst,
    netAmunt: net,
  };
};

export const isDistributorSaleOrder = (order: Row) => order.kind === 'distributor';

export type OrderImage = {
  filename: string;
  type: string;
  uri: string;
};

const mimeFromName = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
};

export const orderImageFromAsset = (asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}): OrderImage => {
  const filename = asset.fileName || asset.uri.split('/').pop()?.split('?')[0] || `photo-${Date.now()}.jpg`;
  return {
    filename,
    type: asset.mimeType || mimeFromName(filename),
    uri: asset.uri,
  };
};

export const readOrderImage = (image: unknown, index = 0): OrderImage | null => {
  if (typeof image === 'string' && image) {
    const filename = image.split('/').pop()?.split('?')[0] || `photo-${index + 1}.jpg`;
    return { filename, type: mimeFromName(filename), uri: image };
  }
  if (!image || typeof image !== 'object') return null;
  const record = image as Partial<OrderImage>;
  if (typeof record.uri !== 'string' || !record.uri) return null;
  const filename = record.filename || record.uri.split('/').pop()?.split('?')[0] || `photo-${index + 1}.jpg`;
  return {
    filename,
    type: record.type || mimeFromName(filename),
    uri: record.uri,
  };
};

const fileName = (filename: string) => {
  const clean = filename.replace(/[^\w.\-]+/g, '_') || `photo-${Date.now()}.jpg`;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(clean) ? clean : `${clean}.jpg`;
};

const appendOrderImage = async (form: FormData, image: OrderImage) => {
  const name = fileName(image.filename);
  const type = image.type?.startsWith('image/') ? image.type.replace('image/jpg', 'image/jpeg') : 'image/jpeg';
  if (image.uri.startsWith('http') || Platform.OS === 'web') {
    const response = await fetch(image.uri);
    const blob = await response.blob();
    form.append('Images', blob, name);
    return;
  }
  form.append('Images', {
    uri: image.uri,
    name,
    type,
  } as unknown as Blob);
};

const appendField = (form: FormData, key: string, value: unknown) => {
  if (value == null) return;
  form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
};

/** Party id may be a string, a Mongo id object, or { $oid } after storage. */
export const partyIdOf = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (!value || typeof value !== 'object') return '';
  const record = value as { $oid?: unknown; _id?: unknown; id?: unknown };
  return partyIdOf(record.$oid) || partyIdOf(record._id) || partyIdOf(record.id);
};

const partyNameOf = (row: Row) =>
  String(row.DistrbutorName || row.OwnerName || row.CustomorName || row.CustomerName || '').trim().toLowerCase();

export const orderPartyId = (order: Row, parties: Row[] = []) => {
  const direct = partyIdOf(order.Distrbutor)
    || partyIdOf(order.Distributor)
    || partyIdOf(order.Customer)
    || partyIdOf(order.distributor);
  if (direct && direct !== '[object Object]') return direct;
  const name = partyNameOf(order);
  if (!name) return '';
  const match = parties.find((row) => partyNameOf(row) === name && partyIdOf(row._id));
  return match ? partyIdOf(match._id) : '';
};

export async function postPendingOrder(
  order: Row,
  context: { distributorId: string; orderBookerId: string; parties?: Row[] },
): Promise<{ saleOrderDate?: string }> {
  const storedServer = await AsyncStorage.getItem('LoginServer');
  if (storedServer === 'snd') {
    const lines = Array.isArray(order.SaleOrderData)
      ? order.SaleOrderData
      : Array.isArray(order.OrderData)
        ? order.OrderData
        : [];
    const customer = String(order.Customer || order.Distrbutor || order.Distributor || '');
    const distributor = String(
      order.ParentDistributor
      || order.AssignedDistributor
      || context.distributorId
      || order.Distrbutor
      || order.Distributor
      || '',
    );
    const saleOrderDate = String(order.SaleOrderDate || order.OrderDate || '');
    const form = new FormData();
    appendField(form, 'Customer', customer);
    appendField(form, 'Distrbutor', distributor);
    appendField(form, 'Distributor', distributor);
    appendField(form, 'DistrbutorName', typeof order.DistrbutorName === 'string' ? order.DistrbutorName : '');
    appendField(form, 'SaleOrderDate', saleOrderDate);
    appendField(form, 'OrderDate', saleOrderDate);
    appendField(form, 'SaleOrderData', lines);
    appendField(form, 'OrderBookerId', context.orderBookerId || order.OrderBookerId || '');
    appendField(form, 'UserId', String(order.UserId || context.orderBookerId || ''));
    appendField(form, 'Remarks', typeof order.Remarks === 'string' ? order.Remarks : '');
    appendField(form, 'Status', 'true');
    appendField(form, 'Visit', order.Visit === true);
    appendField(form, 'VisitedBy', typeof order.VisitedBy === 'string' ? order.VisitedBy : '');
    appendField(
      form,
      'CreatedByRole',
      typeof order.CreatedByRole === 'string' ? order.CreatedByRole : '',
    );
    const throughPhone = order.orderThroughPhone === true || order.OrderThroughPhone === true;
    appendField(form, 'orderThroughPhone', throughPhone);
    appendField(form, 'OrderThroughPhone', throughPhone);
    appendField(form, 'latitude', order.latitude ?? '');
    appendField(form, 'longitude', order.longitude ?? '');
    if (order.location != null) appendField(form, 'location', order.location);
    const images = throughPhone
      ? []
      : Array.isArray(order.Images)
        ? order.Images.map((image, index) => readOrderImage(image, index)).filter((image): image is OrderImage => image !== null)
        : [];
    for (const image of images) await appendOrderImage(form, image);
    const token = await AsyncStorage.getItem('OrderBookerToken');
    await createSndForm(
      '/saleOrder/MobileCreateSaleOrder',
      form,
      token ? { Authorization: `Bearer ${token}` } : {},
    );
    return { saleOrderDate };
  }

  if (isDistributorSaleOrder(order)) {
    const distributor = orderPartyId(order, context.parties);
    if (!distributor) {
      throw new Error('Distributor is required. Open the order from Home and save it again.');
    }
    const lines = Array.isArray(order.OrderData) ? order.OrderData : [];
    const images = Array.isArray(order.Images)
      ? order.Images.map((image, index) => readOrderImage(image, index)).filter((image): image is OrderImage => image !== null)
      : [];
    const orderDate = String(order.SaleOrderDate || order.OrderDate || '');
    const localId = typeof order.id === 'string' ? order.id : '';
    const token = await AsyncStorage.getItem('OrderBookerToken');
    if (!token) {
      throw new Error('Session expired. Please log in again before sending.');
    }
    const form = new FormData();
    appendField(form, 'id', localId);
    appendField(form, 'ClientOrderId', localId);
    appendField(form, 'kind', 'distributor');
    appendField(form, 'Distrbutor', distributor);
    appendField(form, 'Distributor', distributor);
    appendField(form, 'Customer', distributor);
    appendField(form, 'DistrbutorName', typeof order.DistrbutorName === 'string' ? order.DistrbutorName : '');
    appendField(form, 'OrderDate', orderDate);
    appendField(form, 'SaleOrderDate', orderDate);
    appendField(form, 'OrderData', lines);
    appendField(form, 'Remarks', typeof order.Remarks === 'string' ? order.Remarks : '');
    appendField(form, 'purchase', typeof order.purchase === 'string' ? order.purchase : '');
    appendField(form, 'Balance', Number(order.Balance) || 0);
    appendField(form, 'TotalAmount', Number(order.TotalAmount) || 0);
    appendField(form, 'latitude', order.latitude == null ? '' : String(order.latitude));
    appendField(form, 'longitude', order.longitude == null ? '' : String(order.longitude));
    if (order.location != null) appendField(form, 'location', order.location);
    appendField(form, 'PostStatus', typeof order.PostStatus === 'string' && order.PostStatus ? order.PostStatus : 'Accept');
    appendField(form, 'Visit', order.Visit === true);
    const throughPhone = order.orderThroughPhone === true || order.OrderThroughPhone === true;
    appendField(form, 'orderThroughPhone', throughPhone);
    appendField(form, 'OrderThroughPhone', throughPhone);
    appendField(form, 'UserId', context.orderBookerId);
    appendField(form, 'OrderBookerId', context.orderBookerId);
    if (!throughPhone) {
      for (const image of images) await appendOrderImage(form, image);
    }
    await createFormDataFunction(
      '/DistributorSaleOrder',
      form,
      { Authorization: `Bearer ${token}` },
    );
    return { saleOrderDate: orderDate };
  }

  const sendOrder: Row = { ...order };
  sendOrder.Distributor = context.distributorId;
  sendOrder.Distrbutor = context.distributorId;
  sendOrder.UserId = context.orderBookerId;
  sendOrder.OrderBookerId = sendOrder.OrderBookerId || context.orderBookerId;
  await createDataFunction('/saleOrder/MobileCreateSaleOrder', sendOrder);
  return {};
}
