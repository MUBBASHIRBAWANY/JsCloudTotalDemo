import { MongoClient, ObjectId } from "mongodb";

const c = new MongoClient("mongodb://localhost:27018/JafferSons");
await c.connect();
const db = c.db("JafferSons");
const num = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};
const idOf = (p) => (p && typeof p === "object" ? String(p._id || p.value || "") : String(p || ""));

const FROM = "2026-07-01";
const TO = "2026-11-12";
const inRange = (d) => d >= FROM && d <= TO;

const add = (map, k, q) => map.set(k, (map.get(k) || 0) + q);

const sale = new Map();
const dc = new Map();
const purchase = new Map();
const rcDist = new Map();
const rcOld = new Map();

for (const d of await db.collection("salesinvoices").find({ PostStatus: true, SalesInvoiceDate: { $gte: FROM, $lte: TO } }, { projection: { Store: 1, SalesData: 1 } }).toArray()) {
  for (const l of d.SalesData || []) add(sale, `${d.Store}|${idOf(l.product)}`, num(l.totalBox));
}
for (const d of await db.collection("orderdcs").find({ PostStatus: { $in: ["Invoiced", "Deliverd"] }, DCDate: { $gte: FROM, $lte: TO } }, { projection: { Store: 1, DCData: 1 } }).toArray()) {
  for (const l of d.DCData || []) add(dc, `${d.Store}|${idOf(l.product)}`, num(l.DeliveredBox));
}
for (const d of await db.collection("purchaseinvoices").find({ PurchaseInvoiceDate: { $gte: FROM, $lte: TO } }, { projection: { Store: 1, PostStatus: 1, PurchaseData: 1, Type: 1 } }).toArray()) {
  for (const l of d.PurchaseData || []) add(purchase, `${d.Store}|${idOf(l.product)}`, num(l.totalBox));
}
for (const d of await db.collection("rcs").find({ RcDate: { $gte: FROM, $lte: TO } }, { projection: { Store: 1, PostStatus: 1, RcData: 1 } }).toArray()) {
  const st = String(d.PostStatus);
  if (st === "false") continue;
  for (const l of d.RcData || []) {
    const q = num(l.totalBox);
    add(rcDist, `${d.Store}|${idOf(l.product)}`, q);
    if (st === "true") add(rcOld, `${d.Store}|${idOf(l.product)}`, q);
  }
}

const keys = new Set([...sale.keys(), ...dc.keys(), ...purchase.keys(), ...rcDist.keys(), ...rcOld.keys()]);
const hits = [];
let saleTotal = 0, dcTotal = 0, purchaseTotal = 0, rcDistTotal = 0, rcOldTotal = 0;
for (const k of keys) {
  const s = sale.get(k) || 0;
  const d = dc.get(k) || 0;
  const p = purchase.get(k) || 0;
  const rd = rcDist.get(k) || 0;
  const ro = rcOld.get(k) || 0;
  saleTotal += s; dcTotal += d; purchaseTotal += p; rcDistTotal += rd; rcOldTotal += ro;
  const outGap = s - d;
  const inGap = (p + ro) - rd;
  const net = inGap - outGap;
  if (outGap === 380 || outGap === -380 || inGap === 380 || inGap === -380 || net === 380 || net === -380) {
    hits.push({ k, sale: s, dc: d, purchase: p, rcDist: rd, rcOld: ro, outGap, inGap, net });
  }
}
console.log({ from: FROM, to: TO, saleTotal, dcTotal, purchaseTotal, rcDistTotal, rcOldTotal, outGap: saleTotal - dcTotal, inGap: (purchaseTotal + rcOldTotal) - rcDistTotal });
console.log("hits", hits.length);

const ids = [...new Set(hits.map((h) => h.k.split("|")[1]))].filter((id) => ObjectId.isValid(id));
const products = await db.collection("products").find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, { projection: { ProductName: 1, salesFlowRef: 1 } }).toArray();
const stores = await db.collection("stores").find({}, { projection: { StoreName: 1 } }).toArray();
const pn = Object.fromEntries(products.map((p) => [String(p._id), p.ProductName]));
const sn = Object.fromEntries(stores.map((s) => [String(s._id), s.StoreName]));
for (const h of hits) {
  const [store, pid] = h.k.split("|");
  console.log(sn[store] || store, "|", pn[pid] || pid, h);
}
await c.close();
