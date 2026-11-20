import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyQtyToLine,
  buildPurchaseAccounts,
  buildRCOptions,
  filterProductsByVendorCode,
  invoiceHeaderTotal,
  productIdOf,
  productNameOf,
  purchaseLineTotals,
  rcRowsFromSelection,
  voucherTotals,
} from "./purchaseInvoiceAdd.js";

const products = [
  { _id: "p1", ProductName: "Soap", mastercode: "10-SOAP" },
  { _id: "p2", ProductName: "Oil", mastercode: "20-OIL" },
];

const vendors = [
  { _id: "v1", code: "10", VendorName: "Alpha" },
  { _id: "v2", code: "20", VendorName: "Beta" },
];

const rcList = [
  {
    Vendor: "v1",
    VendorCode: "10",
    RcCode: "10-RC1",
    SalesFlowRef: "DC-1",
    Store: "s1",
    Location: "l1",
    RcData: [{ product: "p1", box: 2 }],
  },
  {
    Vendor: "v2",
    VendorCode: "20",
    RcCode: "20-RC9",
    SalesFlowRef: "DC-9",
    RcData: [{ product: "p2" }],
  },
  {
    RcCode: "10-OLD",
    SalesFlowRef: "",
    RcData: [{ product: { _id: "p1", ProductName: "Soap" } }],
  },
];

describe("Purchase invoice product name", () => {
  it("reads ProductName when the product id matches", () => {
    assert.equal(productNameOf(products, { product: "p1" }), "Soap");
  });

  it("does not throw when the product is missing from the list", () => {
    assert.equal(productNameOf(products, { product: "missing" }), "");
    assert.equal(productNameOf(undefined, { product: "p1" }), "");
    assert.equal(productNameOf(products, {}), "");
  });

  it("uses the name saved on the row when the master list has no match", () => {
    assert.equal(
      productNameOf([], { product: "gone", ProductName: "Old Soap" }),
      "Old Soap"
    );
  });

  it("reads an id from a populated product object", () => {
    assert.equal(productIdOf({ _id: "p1", ProductName: "Soap" }), "p1");
    assert.equal(productIdOf("p1"), "p1");
    assert.equal(productIdOf(null), "");
  });
});

describe("RC selection on the purchase form", () => {
  it("shows only the selected vendor RC, including code-prefix matches", () => {
    const options = buildRCOptions(rcList, vendors, "v1");
    assert.deepEqual(
      options.map((item) => item.value),
      ["10-RC1", "10-OLD"]
    );
    assert.equal(options[0].label, "10-RC1 / DC-1");
    assert.equal(options[1].label, "10-OLD / N/A");
    assert.equal(options[0].data[0].product, "p1");
  });

  it("returns an empty dropdown until a vendor is selected", () => {
    assert.deepEqual(buildRCOptions(rcList, vendors, null), []);
    assert.deepEqual(buildRCOptions(rcList, vendors, ""), []);
  });

  it("normalizes RC lines so a populated product does not crash the table", () => {
    const rows = rcRowsFromSelection(rcList[2].RcData);
    assert.equal(rows[0].product, "p1");
    assert.equal(rows[0].ProductName, "Soap");
    assert.equal(rows[0].id, "rc-0");
    assert.equal(productNameOf(products, rows[0]), "Soap");
  });

  it("keeps an existing line id and an empty selection", () => {
    assert.deepEqual(rcRowsFromSelection(null), []);
    assert.equal(rcRowsFromSelection([{ id: 7, product: "p2" }])[0].id, 7);
  });
});

describe("Vendor products and line totals", () => {
  it("keeps products whose master code starts with the vendor code", () => {
    assert.deepEqual(
      filterProductsByVendorCode(products, "10").map((item) => item._id),
      ["p1"]
    );
    assert.deepEqual(filterProductsByVendorCode(null, "10"), []);
  });

  it("sums carton, box, gst and net amount across lines", () => {
    const totals = purchaseLineTotals([
      { carton: "1", box: "2", unit: "12", discount: "5", Gst: "10", netAmunt: "100", GrossAmount: "80" },
      { carton: "bad", box: 3, Gst: "", netAmunt: "20.5", GrossAmount: "15" },
    ]);
    assert.equal(totals.totalCarton, 1);
    assert.equal(totals.totalBox, 5);
    assert.equal(totals.totalUnit, 12);
    assert.equal(totals.totalDiscount, 5);
    assert.equal(totals.totalGST, 10);
    assert.equal(totals.totalNetAmount, 120.5);
    assert.equal(totals.totalGrossAmount, 95);
  });

  it("returns zeros for an empty table", () => {
    const totals = purchaseLineTotals([]);
    assert.equal(totals.totalNetAmount, 0);
    assert.equal(totals.totalBox, 0);
    assert.equal(invoiceHeaderTotal(0, {}), 0);
  });

  it("adds header tax and subtracts header discount from the net amount", () => {
    assert.equal(
      invoiceHeaderTotal(1000, { AdvanceTax: 10, discountAmount: 25, GST: 5 }),
      990
    );
  });
});

describe("Quantity calculation", () => {
  const product = {
    _id: "p1",
    BoxinCarton: 10,
    PcsinBox: 6,
    TPPurchase: 100,
    PurchaseDiscountPer: 10,
    RetailPrice: 120,
    SaleTaxPercent: "18",
    SaleTaxBy: 1,
  };

  it("calculates units from carton and box, then gst and net amount", () => {
    const line = applyQtyToLine(
      { box: 2, carton: 1, inclGstAmnt: 0, AfterTaxdiscount: 0, AdvanceTax: 0 },
      { discount: 0 },
      product
    );
    assert.equal(line.unit, 72);
    assert.equal(line.totalBox, 12);
    assert.equal(line.GrossAmount, "1200.0000");
    assert.equal(line.discount, 120);
    assert.equal(line.ValueAfterDiscout, 1080);
    assert.equal(Number(line.Gst), 96);
    assert.equal(line.netAmunt, "1176.0000");
  });

  it("leaves the line unchanged when the product is not in the list", () => {
    const row = { box: 2, carton: 1, product: "missing" };
    assert.equal(applyQtyToLine(row, row, undefined), row);
  });

  it("uses only boxes when carton is zero", () => {
    const line = applyQtyToLine(
      { box: 3, carton: 0, inclGstAmnt: 0, AfterTaxdiscount: 0, AdvanceTax: 0 },
      { discount: 0 },
      { ...product, SaleTaxPercent: "0" }
    );
    assert.equal(line.unit, 18);
    assert.equal(line.Gst, 0);
  });
});

describe("Purchase voucher", () => {
  it("balances debit and credit for a simple invoice", () => {
    const accounts = buildPurchaseAccounts({
      totalGrossAmount: 1000,
      totalGST: 180,
      totalDiscount: 0,
      totalNetAmount: 1180,
      totals: { GST: 0, AdvanceTax: 0, discountAmount: 0 },
    });
    const voucher = voucherTotals(accounts);
    assert.equal(voucher.debit, 1180);
    assert.equal(voucher.credit, 1180);
    assert.equal(voucher.balanced, true);
  });

  it("reports an imbalance when line gst is missing from the vendor credit", () => {
    const accounts = buildPurchaseAccounts({
      totalGrossAmount: 100,
      totalGST: 18,
      totalDiscount: 0,
      totalNetAmount: 100,
      totals: { GST: 0, AdvanceTax: 0, discountAmount: 0 },
    });
    const voucher = voucherTotals(accounts);
    assert.equal(voucher.balanced, false);
    assert.equal(voucher.debit, 118);
    assert.equal(voucher.credit, 100);
  });
});
