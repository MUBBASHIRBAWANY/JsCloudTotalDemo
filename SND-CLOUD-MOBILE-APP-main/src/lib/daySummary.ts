const amount = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const text = (value: unknown) => (typeof value === 'string' ? value : '');

export type DaySummaryLine = {
  productId: string;
  productName: string;
  productCode: string;
  carton: number;
  box: number;
  rate: number;
  gross: number;
  gst: number;
  net: number;
  units: number;
  kg: number;
  liters: number;
  cartons: number;
};

export type DaySummaryCustomer = {
  saleOrderId: string;
  saleOrderNumber: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  remarks: string;
  lines: DaySummaryLine[];
  carton: number;
  box: number;
  gross: number;
  gst: number;
  net: number;
};

export type DaySummaryTotals = {
  orders: number;
  customers: number;
  carton: number;
  box: number;
  gross: number;
  gst: number;
  net: number;
  units: number;
  kg: number;
  liters: number;
  cartons: number;
  avgSkuPerOutlet: number;
  avgSkuPerBill: number;
};

export type DaySummary = {
  date: string;
  orderBookerId: string;
  orderBookerName: string;
  customers: DaySummaryCustomer[];
  totals: DaySummaryTotals;
};

export type PackProduct = {
  _id?: string;
  ProductName?: string;
  BoxinCarton?: number | string;
  PcsinBox?: number | string;
  GRAM?: number | string;
};

export type DayDashboard = {
  net: number;
  avgSkuPerOutlet: number;
  avgSkuPerBill: number;
  cartons: number;
  units: number;
  liters: number;
  kg: number;
  orders: number;
  outlets: number;
};

export type DayTrendPoint = {
  date: string;
  orders: number;
  customers: number;
  sku: number;
  avgSkuPerBill: number;
  net: number;
  sales: number;
};

export type WeekBucket = {
  label: string;
  start: string;
  end: string;
};

const emptyTotals = (): DaySummaryTotals => ({
  orders: 0,
  customers: 0,
  carton: 0,
  box: 0,
  gross: 0,
  gst: 0,
  net: 0,
  units: 0,
  kg: 0,
  liters: 0,
  cartons: 0,
  avgSkuPerOutlet: 0,
  avgSkuPerBill: 0,
});

const readLine = (value: unknown): DaySummaryLine | null => {
  if (!value || typeof value !== 'object') return null;
  const line = value as Record<string, unknown>;
  const carton = Math.trunc(amount(line.carton));
  return {
    productId: text(line.productId),
    productName: text(line.productName) || 'Product',
    productCode: text(line.productCode),
    carton,
    box: Math.trunc(amount(line.box)),
    rate: amount(line.rate),
    gross: amount(line.gross),
    gst: amount(line.gst),
    net: amount(line.net),
    units: amount(line.units),
    kg: amount(line.kg),
    liters: amount(line.liters),
    cartons: amount(line.cartons) || carton,
  };
};

const readCustomer = (value: unknown): DaySummaryCustomer | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const lines = Array.isArray(row.lines)
    ? row.lines.map(readLine).filter((line): line is DaySummaryLine => line !== null)
    : [];
  return {
    saleOrderId: text(row.saleOrderId),
    saleOrderNumber: text(row.saleOrderNumber),
    customerId: text(row.customerId),
    customerName: text(row.customerName) || 'Customer',
    customerCode: text(row.customerCode),
    remarks: text(row.remarks),
    lines,
    carton: Math.trunc(amount(row.carton)),
    box: Math.trunc(amount(row.box)),
    gross: amount(row.gross),
    gst: amount(row.gst),
    net: amount(row.net),
  };
};

export const readDaySummary = (payload: unknown): DaySummary | null => {
  const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
  const source = record && record.data && typeof record.data === 'object' && !Array.isArray(record.data)
    ? record.data as Record<string, unknown>
    : record;
  if (!source || typeof source.date !== 'string') return null;
  const totals = source.totals && typeof source.totals === 'object'
    ? source.totals as Record<string, unknown>
    : {};
  return {
    date: source.date,
    orderBookerId: text(source.orderBookerId),
    orderBookerName: text(source.orderBookerName),
    customers: Array.isArray(source.customers)
      ? source.customers.map(readCustomer).filter((row): row is DaySummaryCustomer => row !== null)
      : [],
    totals: {
      ...emptyTotals(),
      orders: Math.trunc(amount(totals.orders)),
      customers: Math.trunc(amount(totals.customers)),
      carton: Math.trunc(amount(totals.carton)),
      box: Math.trunc(amount(totals.box)),
      gross: amount(totals.gross),
      gst: amount(totals.gst),
      net: amount(totals.net),
      units: amount(totals.units),
      kg: amount(totals.kg),
      liters: amount(totals.liters),
      cartons: amount(totals.cartons),
      avgSkuPerOutlet: amount(totals.avgSkuPerOutlet),
      avgSkuPerBill: amount(totals.avgSkuPerBill),
    },
  };
};

const readTrendPoint = (value: unknown): DayTrendPoint | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(row.date))) return null;
  const orders = Math.trunc(amount(row.orders));
  const sku = amount(row.sku);
  const avg = amount(row.avgSkuPerBill);
  const net = amount(row.net);
  return {
    date: text(row.date),
    orders,
    customers: Math.trunc(amount(row.customers)),
    sku,
    avgSkuPerBill: avg || (orders > 0 ? sku / orders : 0),
    net,
    sales: row.sales == null || row.sales === '' ? net : amount(row.sales),
  };
};

export const readDayTrend = (payload: unknown): DayTrendPoint[] => {
  const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
  const source = record && record.data && typeof record.data === 'object' && !Array.isArray(record.data)
    ? record.data as Record<string, unknown>
    : record;
  const days = source && Array.isArray(source.days) ? source.days : [];
  return days.map(readTrendPoint).filter((day): day is DayTrendPoint => day !== null);
};

export const todayKey = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export const shiftDate = (iso: string, days: number) => {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year || 1970, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  const monthText = String(date.getMonth() + 1).padStart(2, '0');
  const dayText = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${monthText}-${dayText}`;
};

export const recentDates = (end: string, count: number) =>
  Array.from({ length: count }, (_, index) => shiftDate(end, -index));

const dateFromKey = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
};

const toKey = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const dayLabel = (iso: string, today = todayKey()) => {
  if (iso === today) return 'Today';
  if (iso === shiftDate(today, -1)) return 'Yesterday';
  return WEEKDAYS[dateFromKey(iso).getDay()] || iso;
};

export const shortDateLabel = (iso: string) => {
  const date = dateFromKey(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
};

const isoWeekNumber = (date: Date) => {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export const weekBuckets = (today = todayKey()): WeekBucket[] => {
  const current = dateFromKey(today);
  const weekday = current.getDay() || 7;
  const monday = new Date(current.getFullYear(), current.getMonth(), current.getDate() - weekday + 1);
  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() - (6 - index) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    let label = `Wk\n${isoWeekNumber(start)}`;
    if (index === 6) label = 'This\nWeek';
    else if (index === 5) label = 'Last\nWeek';
    return { label, start: toKey(start), end: toKey(end) };
  });
};

export const trendRange = (today = todayKey()) => {
  const weeks = weekBuckets(today);
  return { from: weeks[0]?.start || today, to: today, weeks };
};

export const formatDecimal = (value: number, digits = 2) => {
  const fixed = (Number.isFinite(value) ? value : 0).toFixed(digits);
  const negative = fixed.startsWith('-');
  const [whole, fraction] = fixed.replace('-', '').split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = fraction != null ? `${grouped}.${fraction}` : grouped;
  return negative ? `-${body}` : body;
};

export const formatCount = (value: number) => formatDecimal(Math.round(value), 0);

export const formatCompact = (value: number) => {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const scaled = (divisor: number, suffix: string) => {
    const raw = abs / divisor;
    const digits = raw >= 10 ? 1 : 2;
    const text = raw.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    return `${sign}${text}${suffix}`;
  };
  if (abs >= 10000000) return scaled(10000000, 'Cr');
  if (abs >= 100000) return scaled(100000, 'L');
  if (abs >= 1000) return scaled(1000, 'k');
  return formatDecimal(Math.round(n), 0);
};

const mlEach = (name: string) => {
  const ml = name.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
  if (ml) return amount(ml[1]);
  const liters = name.match(/(\d+(?:\.\d+)?)\s*(?:ltr|litre|liter)\b/i);
  return liters ? amount(liters[1]) * 1000 : 0;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const packLine = (line: DaySummaryLine, product: PackProduct | undefined) => {
  const pcsInBox = amount(product?.PcsinBox);
  const boxInCarton = amount(product?.BoxinCarton);
  const gram = amount(product?.GRAM);
  const hasPack = pcsInBox > 0 || boxInCarton > 0 || gram > 0;
  if (!product || !hasPack) {
    return {
      units: line.units,
      kg: line.kg,
      liters: line.liters,
      cartons: line.cartons || line.carton,
    };
  }
  const units = Math.round(pcsInBox * (line.carton * boxInCarton + line.box));
  const cartons = line.carton + (boxInCarton > 0 ? line.box / boxInCarton : 0);
  const ml = mlEach(String(product.ProductName || line.productName || ''));
  return {
    units,
    cartons,
    liters: ml > 0 ? (units * ml) / 1000 : 0,
    kg: ml > 0 ? 0 : (units * gram) / 1000,
  };
};

const skuIds = (lines: DaySummaryLine[], saleOrderId: string) => {
  const ids = new Set(lines.map((line) => line.productId).filter(Boolean));
  if (ids.size > 0) return ids;
  lines.forEach((_, index) => ids.add(`${saleOrderId}-${index}`));
  return ids;
};

export const blankDashboard = (): DayDashboard => ({
  net: 0,
  avgSkuPerOutlet: 0,
  avgSkuPerBill: 0,
  cartons: 0,
  units: 0,
  liters: 0,
  kg: 0,
  orders: 0,
  outlets: 0,
});

export const measureSummary = (summary: DaySummary, products: PackProduct[]): DayDashboard => {
  const byId = new Map(products.map((product) => [String(product._id || ''), product]));
  const outlets = new Map<string, Set<string>>();
  let units = 0;
  let kg = 0;
  let liters = 0;
  let cartons = 0;
  let billSku = 0;

  const selling = summary.customers.filter((customer) => customer.lines.length > 0);
  for (const customer of selling) {
    const ids = skuIds(customer.lines, customer.saleOrderId);
    billSku += ids.size;
    const key = customer.customerId || customer.saleOrderId;
    const outlet = outlets.get(key) || new Set<string>();
    ids.forEach((id) => outlet.add(id));
    outlets.set(key, outlet);
    for (const line of customer.lines) {
      const packed = packLine(line, byId.get(line.productId));
      units += packed.units;
      kg += packed.kg;
      liters += packed.liters;
      cartons += packed.cartons;
    }
  }

  const outletSku = [...outlets.values()].reduce((sum, ids) => sum + ids.size, 0);
  return {
    net: summary.totals.net,
    avgSkuPerOutlet: outlets.size ? roundMoney(outletSku / outlets.size) : 0,
    avgSkuPerBill: selling.length ? roundMoney(billSku / selling.length) : 0,
    cartons: roundMoney(cartons),
    units,
    liters: roundMoney(liters),
    kg: roundMoney(kg),
    orders: summary.totals.orders,
    outlets: outlets.size,
  };
};

export const trendPointFromSummary = (summary: DaySummary, products: PackProduct[] = []): DayTrendPoint => {
  const metrics = measureSummary(summary, products);
  return {
    date: summary.date,
    orders: summary.totals.orders,
    customers: summary.totals.customers,
    sku: roundMoney(metrics.avgSkuPerBill * summary.customers.length),
    avgSkuPerBill: metrics.avgSkuPerBill,
    net: summary.totals.net,
    sales: summary.totals.net,
  };
};
