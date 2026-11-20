import { MongoClient } from "mongodb";

const c = new MongoClient("mongodb://localhost:27018/JafferSons");
await c.connect();
const db = c.db("JafferSons");
const inv = await db.collection("purchaseinvoices").findOne(
  { PurchaseInvoice: "02000235" },
  { projection: { PurchaseInvoice: 1, PurchaseInvoiceDate: 1, PostStatus: 1, Type: 1, RCNumber: 1, Store: 1, Vendor: 1, PurchaseData: 1 } }
);
const lines = (inv?.PurchaseData || []).map((l) => ({
  product: l.product,
  totalBox: l.totalBox,
  box: l.box,
}));
let rc = null;
if (inv?.RCNumber) {
  rc = await db.collection("rcs").findOne(
    { RcCode: inv.RCNumber },
    { projection: { RcCode: 1, RcDate: 1, PostStatus: 1, Store: 1, RcData: 1 } }
  );
}
const rcLines = (rc?.RcData || []).filter((l) => String(l.product) === "685b98cfb6de055fd670f8c1").map((l) => ({
  totalBox: l.totalBox,
  box: l.box,
}));
const product = await db.collection("products").findOne(
  { _id: new (await import("mongodb")).ObjectId("685b98cfb6de055fd670f8c1") },
  { projection: { ProductName: 1, salesFlowRef: 1 } }
);
let store = null;
if (inv?.Store) {
  try {
    store = await db.collection("stores").findOne(
      { _id: new (await import("mongodb")).ObjectId(inv.Store) },
      { projection: { StoreName: 1 } }
    );
  } catch {}
}
const sameProductPurchases = await db.collection("purchaseinvoices").aggregate([
  { $unwind: "$PurchaseData" },
  { $match: { "PurchaseData.product": "685b98cfb6de055fd670f8c1" } },
  { $project: { PurchaseInvoice: 1, PurchaseInvoiceDate: 1, PostStatus: 1, Type: 1, RCNumber: 1, Store: 1, totalBox: "$PurchaseData.totalBox" } },
]).toArray();
console.log(JSON.stringify({
  invoice: {
    no: inv?.PurchaseInvoice,
    date: inv?.PurchaseInvoiceDate,
    posted: inv?.PostStatus,
    type: inv?.Type,
    rcNumber: inv?.RCNumber,
    store: store?.StoreName || inv?.Store,
  },
  lines,
  product,
  rc: rc ? { code: rc.RcCode, date: rc.RcDate, status: rc.PostStatus, lines: rcLines, allLines: (rc.RcData || []).length } : null,
  purchasesOfProduct: sameProductPurchases,
}, null, 2));
await c.close();
