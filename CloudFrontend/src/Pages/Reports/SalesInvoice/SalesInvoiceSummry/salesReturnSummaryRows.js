const safeNum = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const DISCOUNT_PARTS = [
  "diBspass",
  "RToffer",
  "WToffer",
  "RpDrive",
  "WHOLESALEDEAL",
  "RTWholeSale",
  "SubDisTPromotion",
  "TradeOffer",
  "HOTZONEDRIVE",
  "SPECIALDISCOUNT",
  "SpecialTO",
];

export const invoiceLookupKey = (item = {}) =>
  String(item.SalesInvoice || item.Invoice || item.invoice || "").trim();

const isReturnLine = (item) =>
  String(item?.SaleType || "").trim().toLowerCase() === "return";

const asList = (value) => (Array.isArray(value) ? value : []);

// Dump stores return discount on the component fields and forces discount to 0.
const lineDiscount = (item) => {
  const fromParts = DISCOUNT_PARTS.reduce((sum, key) => sum + safeNum(item?.[key]), 0);
  return fromParts !== 0 ? fromParts : safeNum(item?.discount);
};

const blankReturnInvoice = (item, invoice) => ({
  SaleType: "Return",
  SalesInvoice: invoice,
  SalesInvoiceDate: item.SalesInvoiceDate || "",
  Store: item.Store || "",
  Location: item.Location || "",
  Client: item.Client || "",
  OrderBooker: item.OrderBooker || "",
  SalesFlowRef: item.SalesFlowRef || "",
  carton: 0,
  GrossAmount: 0,
  Gst: 0,
  Advancetax: 0,
  TTS: 0,
  ProductAmount: 0,
  discount: 0,
  SpecialTO: 0,
  ClaimableSpecialTO: 0,
  UnClaimableSpecialTO: 0,
  specialdiscount: 0,
  AddAmount: 0,
  LessAmount: 0,
  diBspass: 0,
  RToffer: 0,
  WToffer: 0,
  RpDrive: 0,
  WHOLESALEDEAL: 0,
  RTWholeSale: 0,
  SubDisTPromotion: 0,
  TradeOffer: 0,
  HOTZONEDRIVE: 0,
  SPECIALDISCOUNT: 0,
});

export function salesReturnInvoiceRows(dumpLines) {
  const grouped = new Map();

  asList(dumpLines).forEach((item) => {
    if (!isReturnLine(item)) return;
    const invoice = invoiceLookupKey(item);
    if (!invoice) return;

    let row = grouped.get(invoice);
    if (!row) {
      row = blankReturnInvoice(item, invoice);
      grouped.set(invoice, row);
    }

    row.carton += safeNum(item.carton);
    row.GrossAmount += safeNum(item.GrossAmount);
    row.Gst += safeNum(item.Gst);
    row.Advancetax += safeNum(item.Advancetax);
    row.TTS += safeNum(item.TTS);
    row.ProductAmount += safeNum(item.ProductAmount);
    row.SpecialTO += safeNum(item.SpecialTO);
    row.ClaimableSpecialTO += safeNum(item.ClaimableSpecialTO);
    row.UnClaimableSpecialTO += safeNum(item.UnClaimableSpecialTO);
    row.discount += lineDiscount(item);

    DISCOUNT_PARTS.forEach((key) => {
      if (key === "SpecialTO") return;
      row[key] += safeNum(item[key]);
    });
  });

  return [...grouped.values()].map((row) => {
    const computedNet =
      row.GrossAmount + row.Gst + row.Advancetax - row.discount - row.TTS;
    const total = row.ProductAmount !== 0 ? row.ProductAmount : computedNet;
    return { ...row, TotalAmount: total, Amount: total };
  });
}

const alreadyCoversReturn = (row, invoice) => {
  if (!invoice || invoiceLookupKey(row) !== invoice) return false;
  const type = String(row?.SaleType || "").trim().toLowerCase();
  const gross = Number(row?.GrossAmount);
  return type === "return" || (Number.isFinite(gross) && gross < 0);
};

export function mergeSalesReturnInvoices(summaryRows, dumpLines) {
  const rows = asList(summaryRows);
  const returns = salesReturnInvoiceRows(dumpLines).filter(
    (row) => !rows.some((existing) => alreadyCoversReturn(existing, invoiceLookupKey(row)))
  );
  return rows.concat(returns);
}

export function salesReturnProductClientRows(dumpLines) {
  const grouped = new Map();

  asList(dumpLines).forEach((item) => {
    if (!isReturnLine(item)) return;
    const product = item?.Product;
    if (product == null || product === "") return;
    const client = item?.Client || "";
    const key = `${String(product)}::${String(client)}`;

    let row = grouped.get(key);
    if (!row) {
      row = {
        SaleType: "Return",
        Product: product,
        Client: client,
        Store: item.Store || "",
        carton: 0,
        GrossAmount: 0,
        Gst: 0,
        Advancetax: 0,
        discount: 0,
      };
      grouped.set(key, row);
    }

    row.carton += safeNum(item.carton);
    row.GrossAmount += safeNum(item.GrossAmount);
    row.Gst += safeNum(item.Gst);
    row.Advancetax += safeNum(item.Advancetax);
    row.discount += lineDiscount(item);
  });

  return [...grouped.values()];
}
