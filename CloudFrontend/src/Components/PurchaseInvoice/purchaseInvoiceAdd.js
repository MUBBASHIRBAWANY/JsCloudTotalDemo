export const productIdOf = (product) => {
  if (product && typeof product === "object") return product._id || "";
  return product || "";
};

export const productNameOf = (products, row) => {
  const list = Array.isArray(products) ? products : [];
  const matched = list.find((item) => String(item?._id) === String(productIdOf(row?.product)));
  return matched?.ProductName || row?.ProductName || "";
};

export const rcRowsFromSelection = (data) =>
  (data || []).map((row, index) => ({
    ...row,
    id: row.id || row._id || `rc-${index}`,
    product: productIdOf(row.product),
    ProductName: row.ProductName || row.product?.ProductName || "",
  }));

export const buildRCOptions = (rcList, vendors, vendorId) => {
  if (!vendorId) return [];
  const vendorCode = (vendors || []).find((vendor) => vendor._id == vendorId)?.code;
  return (rcList || [])
    .filter(
      (item) =>
        item.Vendor == vendorId ||
        item.VendorCode == vendorCode ||
        item.RcCode?.slice(0, 2) == vendorCode
    )
    .map((item) => ({
      value: item.RcCode,
      label: `${item.RcCode} / ${item.SalesFlowRef || "N/A"}`,
      data: item.RcData,
      SalesFlowRef: item.SalesFlowRef,
      Store: item.Store,
      Location: item.Location,
    }));
};

export const filterProductsByVendorCode = (products, vendorCode) =>
  (products || []).filter((item) => item.mastercode?.slice(0, 2) == vendorCode);

export const purchaseLineTotals = (tableData) => {
  const rows = tableData || [];
  const sum = (pick) => rows.reduce((total, row) => total + (pick(row) || 0), 0);
  return {
    totalDiscount: sum((row) => parseFloat(row.discount)),
    totalGST: sum((row) => parseFloat(row.Gst)),
    totalNetAmount: sum((row) => parseFloat(row.netAmunt)),
    totalBox: sum((row) => parseInt(row.box)),
    totalCarton: sum((row) => parseInt(row.carton)),
    totalUnit: sum((row) => parseInt(row.unit)),
    totalGrossAmount: sum((row) => parseFloat(row.GrossAmount)),
    totalValueAfterDiscount: sum((row) => parseFloat(row.ValueAfterDiscout)),
    totalValuewithGst: sum((row) => parseFloat(row.ValuewithGst)),
    totalAfterTaxdiscount: sum((row) => parseFloat(row.AfterTaxdiscount)),
    totalAdvanceTax: sum((row) => parseFloat(row.AdvanceTax)),
  };
};

export const invoiceHeaderTotal = (totalNetAmount, totals = {}) =>
  Number(
    Number(totalNetAmount) +
      Number(totals.AdvanceTax || 0) -
      Number(totals.discountAmount || 0) +
      Number(totals.GST || 0)
  );

export function applyQtyToLine(updatedRow, previousRow, findProduct) {
  if (!findProduct) return updatedRow;
  const next = { ...updatedRow };
  const BoxinCarton = parseInt(findProduct.BoxinCarton || 0);
  const PcsinBox = parseInt(findProduct.PcsinBox || 0);
  const Allunit = BoxinCarton * PcsinBox;
  const box = parseInt(next.box || 0);
  const carton = parseInt(next.carton || 0);
  if (box === 0) {
    next.unit = Allunit * carton;
  } else if (carton === 0) {
    next.unit = PcsinBox * box;
  } else {
    const totalbox = box * findProduct.PcsinBox;
    next.unit = Allunit * carton + totalbox;
  }
  const boxPrice = next.unit / findProduct.PcsinBox;
  next.GrossAmount = (boxPrice * findProduct.TPPurchase).toFixed(4);
  next.discount = (next.GrossAmount / 100) * findProduct.PurchaseDiscountPer;
  const totalBox = next.unit / findProduct.PcsinBox;
  next.perBoxAmount = (next.inclGstAmnt / totalBox - previousRow.discount).toFixed(4);
  next.RetailValue = (findProduct.RetailPrice * totalBox).toFixed(4);
  next.PerBoxValueGrs = (next.GrossAmount / totalBox).toFixed(4);
  const ValueAfterDiscout = next.GrossAmount - (next.discount || 0);
  next.ValueAfterDiscout = ValueAfterDiscout;
  findProduct.SaleTaxPercent != "0"
    ? findProduct.SaleTaxBy == 2
      ? (next.Gst = ((next.RetailValue / 118) * findProduct.SaleTaxPercent).toFixed(4))
      : (next.Gst = (next.GrossAmount / 100 * findProduct.SaleTaxPercent - (next.discount || 0)).toFixed(4))
    : (next.Gst = 0);
  next.ValuewithGst = (Number(next.Gst) + Number(next.ValueAfterDiscout)).toFixed(4);
  next.netAmunt = parseFloat(next.ValuewithGst - next.AfterTaxdiscount).toFixed(4);
  next.netAmuntWithAdvnaceTax = parseFloat(Number(next.netAmunt) + Number(next.AdvanceTax)).toFixed(5);
  next.totalBox = totalBox;
  return next;
}

export function buildPurchaseAccounts({
  totalGrossAmount,
  totalGST,
  totalDiscount,
  totalNetAmount,
  totals,
}) {
  return [
    { Account: "FinishedGoods", Debit: totalGrossAmount },
    { Account: "GST", Debit: Number(totalGST) + Number(totals.GST) },
    { Account: "AdvanceTax", Debit: Number(totals.AdvanceTax) },
    {
      Account: "Discount",
      Credit: Number(totals.discountAmount || 0) + Number(totalDiscount || 0),
    },
    {
      Account: "Vendor",
      Credit:
        Number(
          Number(totalNetAmount) + Number(totals.AdvanceTax || 0) - Number(totals.discountAmount || 0)
        ) + +Number(totals.GST),
    },
  ];
}

export function voucherTotals(accounts) {
  const debit = (accounts || []).reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
  const credit = (accounts || []).reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);
  return {
    debit,
    credit,
    balanced: debit.toFixed(2) === credit.toFixed(2),
  };
}
