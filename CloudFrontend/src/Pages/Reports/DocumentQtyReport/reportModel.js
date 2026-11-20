export const dcReportConfig = {
  title: 'DC Report',
  endpoint: '/DcOrder',
  reportEndpoint: '/DcOrder/report',
  dateKey: 'DCDate',
  codeKey: 'DCCode',
  linesKey: 'DCData',
  kind: 'dc',
};

export const orderReportConfig = {
  title: 'Order Report',
  endpoint: '/DistributorSaleOrder',
  reportEndpoint: '/DistributorSaleOrder/report',
  dateKey: 'OrderDate',
  codeKey: 'OrderCode',
  linesKey: 'OrderData',
  kind: 'order',
};

export const viewOptions = [
  { label: 'Detail', value: 'Detail' },
  { label: 'Product Summary', value: 'ProductSummary' },
  { label: 'Summary', value: 'Summary' },
];

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const idOf = (value) => {
  if (value == null || value === '') return '';
  if (typeof value === 'object') return String(value._id || value.value || '');
  return String(value);
};

export const toDay = (value) => {
  if (!value) return '';
  const text = String(value);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export const formatReportDate = (value) => {
  const day = toDay(value);
  if (!day) return '';
  const date = new Date(`${day}T00:00:00`);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const dcCategory = (doc) => {
  const status = String(doc?.PostStatus || '').trim().toLowerCase();
  const invoice = doc?.Invoice;
  const hasInvoice = invoice != null && String(invoice).trim() !== '';
  if (status === 'false' || status === 'cancel' || status === 'canceled' || status === 'cancelled') return 'Cancel';
  if (status === 'invoiced' || hasInvoice) return 'Invoiced';
  if (status === 'deliverd' || status === 'delivered') return 'Delivered';
  return '';
};

const statusMatches = (docStatus, filter) => {
  if (!filter || filter === 'All') return true;
  return String(docStatus ?? '').trim().toLowerCase() === String(filter).trim().toLowerCase();
};

const measureLine = (line, product) => {
  const boxesPerCarton = num(product?.boxInCarton);
  const loose = num(line?.box ?? line?.Box);
  const carton = num(line?.carton ?? line?.Carton);
  const storedTotal = line?.totalBox ?? line?.TotalBox;
  let totalBox = storedTotal != null && storedTotal !== '' ? num(storedTotal) : 0;
  if (!totalBox) {
    totalBox = boxesPerCarton > 0 ? carton * boxesPerCarton + loose : loose || carton;
  }
  const delivered = num(line?.DeliveredBox ?? line?.Deliver);
  const remaining = line?.ReamingBox != null && line?.ReamingBox !== ''
    ? num(line.ReamingBox)
    : Math.max(totalBox - delivered, 0);
  const rate = num(line?.Rate || line?.PerBoxValueGrs || product?.tpSale);
  const hasGross = line?.GrossAmount != null || line?.Amount != null;
  const gross = hasGross ? num(line?.GrossAmount ?? line?.Amount) : rate * totalBox;
  const discount = num(line?.discount) + num(line?.specialdiscount) + num(line?.SpecialTO);
  const hasNet = line?.netAmount != null || line?.netAmunt != null;
  const net = hasNet ? num(line?.netAmount ?? line?.netAmunt) : gross - discount;
  return { carton, totalBox, delivered, remaining, rate, gross, discount, net };
};

const emptyTotals = () => ({
  carton: 0,
  totalBox: 0,
  delivered: 0,
  remaining: 0,
  gross: 0,
  discount: 0,
  net: 0,
});

const addMeasure = (bucket, measure) => {
  bucket.carton += measure.carton;
  bucket.totalBox += measure.totalBox;
  bucket.delivered += measure.delivered;
  bucket.remaining += measure.remaining;
  bucket.gross += measure.gross;
  bucket.discount += measure.discount;
  bucket.net += measure.net;
};

export const columnsFor = (kind, view) => {
  if (kind === 'dc' && view === 'Detail') {
    return [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'code', label: 'DC #' },
      { key: 'orderCode', label: 'Order #' },
      { key: 'distributor', label: 'Distributor' },
      { key: 'city', label: 'City' },
      { key: 'store', label: 'Store' },
      { key: 'sku', label: 'SKU' },
      { key: 'product', label: 'Product' },
      { key: 'carton', label: 'Qty In Carton', type: 'qty' },
      { key: 'totalBox', label: 'Qty In Box', type: 'qty' },
      { key: 'delivered', label: 'Delivered Box', type: 'qty' },
      { key: 'remaining', label: 'Remaining Box', type: 'qty' },
      { key: 'status', label: 'Status' },
    ];
  }
  if (kind === 'dc' && view === 'ProductSummary') {
    return [
      { key: 'sku', label: 'SKU' },
      { key: 'product', label: 'Product' },
      { key: 'carton', label: 'Qty In Carton', type: 'qty' },
      { key: 'totalBox', label: 'Qty In Box', type: 'qty' },
      { key: 'delivered', label: 'Delivered Box', type: 'qty' },
      { key: 'remaining', label: 'Remaining Box', type: 'qty' },
      { key: 'documents', label: 'DC Count', type: 'qty' },
    ];
  }
  if (kind === 'dc') {
    return [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'code', label: 'DC #' },
      { key: 'distributor', label: 'Distributor' },
      { key: 'city', label: 'City' },
      { key: 'store', label: 'Store' },
      { key: 'carton', label: 'Qty In Carton', type: 'qty' },
      { key: 'totalBox', label: 'Qty In Box', type: 'qty' },
      { key: 'delivered', label: 'Delivered Box', type: 'qty' },
      { key: 'remaining', label: 'Remaining Box', type: 'qty' },
      { key: 'bilty', label: 'Bilty' },
      { key: 'status', label: 'Status' },
    ];
  }
  if (view === 'Detail') {
    return [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'code', label: 'Order #' },
      { key: 'distributor', label: 'Distributor' },
      { key: 'city', label: 'City' },
      { key: 'store', label: 'Store' },
      { key: 'sku', label: 'SKU' },
      { key: 'product', label: 'Product' },
      { key: 'carton', label: 'Qty In Carton', type: 'qty' },
      { key: 'totalBox', label: 'Qty In Box', type: 'qty' },
      { key: 'rate', label: 'Rate', type: 'money', total: false },
      { key: 'gross', label: 'Gross Amount', type: 'money' },
      { key: 'discount', label: 'Discount', type: 'money' },
      { key: 'net', label: 'Net Amount', type: 'money' },
      { key: 'status', label: 'Status' },
    ];
  }
  if (view === 'ProductSummary') {
    return [
      { key: 'sku', label: 'SKU' },
      { key: 'product', label: 'Product' },
      { key: 'carton', label: 'Qty In Carton', type: 'qty' },
      { key: 'totalBox', label: 'Qty In Box', type: 'qty' },
      { key: 'gross', label: 'Gross Amount', type: 'money' },
      { key: 'discount', label: 'Discount', type: 'money' },
      { key: 'net', label: 'Net Amount', type: 'money' },
      { key: 'documents', label: 'Order Count', type: 'qty' },
    ];
  }
  return [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'code', label: 'Order #' },
    { key: 'distributor', label: 'Distributor' },
    { key: 'city', label: 'City' },
    { key: 'store', label: 'Store' },
    { key: 'carton', label: 'Qty In Carton', type: 'qty' },
    { key: 'totalBox', label: 'Qty In Box', type: 'qty' },
    { key: 'gross', label: 'Gross Amount', type: 'money' },
    { key: 'discount', label: 'Discount', type: 'money' },
    { key: 'net', label: 'Net Amount', type: 'money' },
    { key: 'status', label: 'Status' },
  ];
};

const lookupById = (list) => {
  const map = new Map();
  (list || []).forEach((item) => {
    if (item?.value != null) map.set(String(item.value), item);
  });
  return map;
};

export const buildReportRows = (documents, config, filterData) => {
  const view = filterData.view || 'Detail';
  const products = lookupById(filterData.lookups?.products);
  const distributors = lookupById(filterData.lookups?.distributors);
  const stores = lookupById(filterData.lookups?.stores);
  const selectedProducts = new Set((filterData.products || []).map((item) => String(item.value)));
  const selectedDistributors = new Set((filterData.distributors || []).map((item) => String(item.value)));
  const storeId = filterData.store?.value ? String(filterData.store.value) : '';
  const cityId = filterData.city?.value ? String(filterData.city.value) : '';
  const applyProductFilter = view !== 'Summary' && selectedProducts.size > 0;
  const productGroups = new Map();

  const rows = [];

  (documents || []).forEach((doc) => {
    const day = toDay(doc?.[config.dateKey]);
    if (!day || day < filterData.startDate || day > filterData.endDate) return;
    const category = config.kind === 'dc' ? dcCategory(doc) : '';
    if (config.kind === 'dc') {
      if (!category) return;
      const summaryView = view === 'ProductSummary' || view === 'Summary';
      const wanted = String(filterData.status || 'Delivered').trim().toLowerCase();
      if (wanted !== 'all' && summaryView) {
        if (wanted === 'cancel') {
          if (category !== 'Cancel') return;
        } else if (category !== 'Delivered' && category !== 'Invoiced') return;
      } else if (wanted !== 'all' && category.toLowerCase() !== wanted && wanted !== 'deliveredinvoiced') return;
    } else if (!statusMatches(doc?.PostStatus, filterData.status)) return;

    const distributorId = idOf(doc?.Distrbutor);
    if (selectedDistributors.size > 0 && !selectedDistributors.has(distributorId)) return;
    const distributor = distributors.get(distributorId);
    if (cityId && String(distributor?.cityId || '') !== cityId) return;

    const docStoreId = idOf(doc?.Store);
    if (storeId && docStoreId !== storeId) return;

    const lines = Array.isArray(doc?.[config.linesKey]) ? doc[config.linesKey] : [];
    const header = {
      date: day,
      code: doc?.[config.codeKey] || '',
      distributor: distributor?.name || '',
      city: distributor?.city || '',
      store: stores.get(docStoreId)?.label || '',
      bilty: doc?.BiltyNumber || '',
      status: config.kind === 'dc' ? category : (doc?.PostStatus || ''),
    };

    if (view === 'Summary') {
      const totals = emptyTotals();
      lines.forEach((line) => {
        const product = products.get(idOf(line?.product));
        addMeasure(totals, measureLine(line, product));
      });
      rows.push({ ...header, ...totals });
      return;
    }

    const matched = [];
    lines.forEach((line) => {
      const productId = idOf(line?.product);
      if (applyProductFilter && !selectedProducts.has(productId)) return;
      const product = products.get(productId);
      matched.push({ line, product, productId, measure: measureLine(line, product) });
    });
    if (matched.length === 0) return;

    if (view === 'Detail') {
      matched.forEach(({ line, product, measure }) => {
        rows.push({
          ...header,
          ...measure,
          orderCode: line?.Order || line?.OrderCode || '',
          sku: product?.sku || '',
          product: product?.name || 'Unknown Product',
        });
      });
      return;
    }

    matched.forEach(({ product, productId, measure }) => {
      if (!productGroups.has(productId)) {
        productGroups.set(productId, {
          sku: product?.sku || '',
          product: product?.name || 'Unknown Product',
          ...emptyTotals(),
          documents: new Set(),
        });
      }
      const group = productGroups.get(productId);
      addMeasure(group, measure);
      group.documents.add(String(doc?._id || header.code));
    });
  });

  if (view === 'ProductSummary') {
    return [...productGroups.values()]
      .map((group) => ({ ...group, documents: group.documents.size }))
      .sort((a, b) => String(a.product).localeCompare(String(b.product)));
  }

  return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.code).localeCompare(String(a.code)));
};
