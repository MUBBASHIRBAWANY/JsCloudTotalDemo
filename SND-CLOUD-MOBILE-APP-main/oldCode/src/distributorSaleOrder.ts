import { uploadToCloudinary } from './Api/CloudinaryService';
import { createDataFunction } from './Api/CurdFunctions';
import type { Row } from './useLoginUser';

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

export const isSndProduct = (product: ProductRef) => product.isForSND === 'true' || product.isForSND === true;

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

const remoteImages = async (images: unknown) => {
  if (!Array.isArray(images)) return [];
  const urls: string[] = [];
  for (const image of images) {
    if (typeof image !== 'string' || !image) continue;
    urls.push(image.startsWith('http') ? image : await uploadToCloudinary(image));
  }
  return urls;
};

export async function postPendingOrder(
  order: Row,
  context: { distributorId: string; orderBookerId: string  },
) {
  console.log(context.orderBookerId , context.distributorId)
  if (isDistributorSaleOrder(order)) {
    const { id: _localId, kind: _kind, ...body } = order;
    const images = await remoteImages(body.Images);
    await createDataFunction('/DistributorSaleOrder', {
      ...body,
      Images: images,
      UserId: context.orderBookerId,
      OrderBookerId: context.orderBookerId,

      PostStatus: typeof body.PostStatus === 'string' && body.PostStatus ? body.PostStatus : 'Accept',
    });
    return;
  }

  const sendOrder: Row = { ...order };
  sendOrder.Distributor = context.distributorId;
  sendOrder.Distrbutor = context.distributorId;
  sendOrder.UserId = context.orderBookerId;
  sendOrder.OrderBookerId = sendOrder.OrderBookerId || context.orderBookerId;
  await createDataFunction('/saleOrder/MobileCreateSaleOrder', sendOrder);
}
