import { getDataFundtion } from '../../Api/CurdFunctions';
import { listFromResponse } from '../../Components/Global/distributorAccess';

const SOFTWARE_DATE = '2025-01-01';

const num = (value) => Number(value) || 0;

const toProductId = (raw) => {
  if (!raw) return '';
  if (typeof raw === 'object') return String(raw._id || raw.id || '');
  return String(raw);
};

const buildRows = ({ lines, adjustments, beforeAdjustments, productMap, isWithOpen }) => {
  let value = [];
  if (!isWithOpen) {
    const sale = lines.filter((item) => item.PostStatus === 'Serviced');
    const purchase = lines.filter((item) => item.PostStatus === 'Received');
    value = sale.concat(purchase);
  } else {
    const sale = lines.filter((item) => item.Page === 'Sales' && item.PostStatus !== 'Cancel');
    const purchase = lines.filter((item) => item.Page === 'Purchase' && item.PostStatus === 'Received');
    value = sale.concat(purchase);
  }

  const beforePurchase = value.filter((item) => item.Type === 'Before Purchase');
  const beforeSales = value.filter((item) => item.Type === 'Before Sales');
  const currentPurchase = value.filter((item) => item.Type === 'Current Purchase');
  const currentSales = value.filter((item) => item.Type === 'Current Sales');

  const productData = new Map();
  const getProductRow = (productId) => {
    if (!productId) return null;
    if (!productData.has(productId)) {
      productData.set(productId, {
        productId,
        productName: productMap.get(productId)?.ProductName || 'Unknown',
        beforePurchase: 0,
        beforeSales: 0,
        currentPurchase: 0,
        currentSales: 0,
        stockAdjustmentAdd: 0,
        stockAdjustmentLess: 0,
        beforeStockAdjustmentAdd: 0,
        beforeStockAdjustmentLess: 0,
      });
    }
    return productData.get(productId);
  };

  const getBoxQty = (item, productId) => {
    const box = num(item.Box);
    const carton = num(item.Carton);
    const boxInCarton = num(productMap.get(productId)?.BoxinCarton) || 1;
    if (carton && box) return box + carton * boxInCarton;
    if (box) return box;
    if (carton) return carton * boxInCarton;
    return 0;
  };

  const applyAdjustment = (item, addField, lessField) => {
    const productId = toProductId(item.product);
    const row = getProductRow(productId);
    if (!row) return;
    const qty = getBoxQty(item, productId);
    const type = String(item.adjustmentType || '').trim().toLowerCase();
    if (type === 'add') row[addField] += qty;
    else if (type === 'less') row[lessField] += qty;
  };

  beforePurchase.forEach((item) => {
    const id = toProductId(item.product);
    const row = getProductRow(id);
    if (row) row.beforePurchase += getBoxQty(item, id);
  });
  beforeSales.forEach((item) => {
    const row = getProductRow(toProductId(item.ProductId));
    if (row) row.beforeSales += Math.max(0, num(item.DeliveredBox));
  });
  currentPurchase.forEach((item) => {
    const id = toProductId(item.product);
    const row = getProductRow(id);
    if (row) row.currentPurchase += getBoxQty(item, id);
  });
  currentSales.forEach((item) => {
    const row = getProductRow(toProductId(item.ProductId));
    if (row) row.currentSales += Math.max(0, num(item.DeliveredBox));
  });
  beforeAdjustments.forEach((item) => applyAdjustment(item, 'beforeStockAdjustmentAdd', 'beforeStockAdjustmentLess'));
  adjustments.forEach((item) => applyAdjustment(item, 'stockAdjustmentAdd', 'stockAdjustmentLess'));

  const rows = Array.from(productData.values()).map((item) => {
    const product = productMap.get(String(item.productId));
    const openingStock =
      item.beforePurchase + item.beforeStockAdjustmentAdd
      - item.beforeSales - item.beforeStockAdjustmentLess;
    const endingStock =
      openingStock + item.currentPurchase + item.stockAdjustmentAdd
      - item.currentSales - item.stockAdjustmentLess;
    const retailPrice = num(product?.RetailPrice);
    return {
      ...item,
      SkuCode: product?.code || 'N/A',
      openingStock,
      endingStock,
      retailPrice,
      endingStockAmount: endingStock * retailPrice,
      boxInCarton: num(product?.BoxinCarton) || 1,
      PcsinBox: num(product?.PcsinBox) || 1,
    };
  }).filter((item) =>
    item.beforePurchase || item.beforeSales || item.currentPurchase || item.currentSales ||
    item.stockAdjustmentAdd || item.stockAdjustmentLess ||
    item.beforeStockAdjustmentAdd || item.beforeStockAdjustmentLess
  );

  const resolveProductName = (items, idField) => items.map((item) => ({
    ...item,
    ResolvedProductName: productMap.get(toProductId(item[idField]))?.ProductName || item.ProductName || 'Unknown',
  }));

  return {
    rows,
    rawData: {
      beforePurchase: resolveProductName(beforePurchase, 'product'),
      beforeSales: resolveProductName(beforeSales, 'ProductId'),
      currentPurchase: resolveProductName(currentPurchase, 'product'),
      currentSales: resolveProductName(currentSales, 'ProductId'),
      beforeStockAdjustments: resolveProductName(beforeAdjustments, 'product'),
      stockAdjustments: resolveProductName(adjustments, 'product'),
    },
  };
};

export async function loadStockFlowReport({ distributorIds, startDate, endDate, status }) {
  const isWithOpen = status === 'With Open';
  const prevDate = new Date(startDate);
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  const beforeAdjEndDate = prevDate.toISOString().split('T')[0];

  let ids = distributorIds;
  if (ids == null) {
    const distributors = await getDataFundtion('/Distrbutor');
    ids = listFromResponse(distributors).map((item) => item._id).filter(Boolean);
  }

  const [productRes, ...chunks] = await Promise.all([
    getDataFundtion('/Product'),
    ...(ids || []).map(async (id) => {
      try {
        const [response, adjRes, beforeAdjRes] = await Promise.all([
          getDataFundtion(`/SalesInvoice/StockReport?startDate=${startDate}&endDate=${endDate}&Distrbutor=${id}`),
          getDataFundtion(`/StockAdjustment/Report?Distrbutor=${id}&startDate=${startDate}&endDate=${endDate}`)
            .catch(() => []),
          getDataFundtion(`/StockAdjustment/Report?Distrbutor=${id}&startDate=${SOFTWARE_DATE}&endDate=${beforeAdjEndDate}`)
            .catch(() => []),
        ]);
        return {
          Distrbutor: String(id),
          lines: listFromResponse(response),
          adjustments: listFromResponse(adjRes),
          beforeAdjustments: listFromResponse(beforeAdjRes),
        };
      } catch (err) {
        console.log(err);
        return { Distrbutor: String(id), lines: [], adjustments: [], beforeAdjustments: [] };
      }
    }),
  ]);

  const productList = listFromResponse(productRes);
  const productMap = new Map(productList.map((item) => [String(item._id), item]));
  const byDistributor = chunks.map((chunk) => ({
    Distrbutor: chunk.Distrbutor,
    ...buildRows({
      lines: chunk.lines,
      adjustments: chunk.adjustments,
      beforeAdjustments: chunk.beforeAdjustments,
      productMap,
      isWithOpen,
    }),
  }));
  const merged = buildRows({
    lines: chunks.flatMap((chunk) => chunk.lines),
    adjustments: chunks.flatMap((chunk) => chunk.adjustments),
    beforeAdjustments: chunks.flatMap((chunk) => chunk.beforeAdjustments),
    productMap,
    isWithOpen,
  });

  return {
    products: productList,
    rows: merged.rows,
    rawData: merged.rawData,
    byDistributor,
  };
}
