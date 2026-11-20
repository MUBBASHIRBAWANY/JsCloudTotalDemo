import { MongoClient } from "mongodb";

const c = new MongoClient("mongodb://localhost:27018/JafferSons");
await c.connect();
const db = c.db("JafferSons");
const num = (v) => {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};
const idOf = (p) => (p && typeof p === "object" ? String(p._id || p.value || "") : String(p || ""));

const purchase = new Map();
const directPurchase = new Map();
for (const d of await db.collection("purchaseinvoices").find({}, { projection: { Type: 1, RCNumber: 1, PostStatus: 1, PurchaseData: 1, Store: 1 } }).toArray()) {
  for (const l of d.PurchaseData || []) {
    const k = `${d.Store}|${idOf(l.product)}`;
    const q = num(l.totalBox);
    purchase.set(k, (purchase.get(k) || 0) + q);
    if (d.Type !== "RC") directPurchase.set(k, (directPurchase.get(k) || 0) + q);
  }
}
const rc = new Map();
const rcTrue = new Map();
for (const d of await db.collection("rcs").find({}, { projection: { PostStatus: 1, RcData: 1, Store: 1 } }).toArray()) {
  if (String(d.PostStatus) === "false") continue;
  for (const l of d.RcData || []) {
    const k = `${d.Store}|${idOf(l.product)}`;
    const q = num(l.totalBox);
    rc.set(k, (rc.get(k) || 0) + q);
    if (String(d.PostStatus) === "true") rcTrue.set(k, (rcTrue.get(k) || 0) + q);
  }
}

const keys = new Set([...purchase.keys(), ...rc.keys()]);
const gaps = [];
for (const k of keys) {
  const p = purchase.get(k) || 0;
  const r = rc.get(k) || 0;
  const rt = rcTrue.get(k) || 0;
  const direct = directPurchase.get(k) || 0;
  const oldIn = p + rt;
  const distIn = r;
  const gap = oldIn - distIn;
  if (gap === 380 || gap === -380 || direct === 380 || p - r === 380 || p - r === -380) {
    gaps.push({ key: k, purchase: p, direct, rcAll: r, rcTrue: rt, oldIn, distIn, gap });
  }
}
console.log("matches", gaps.length);
console.log(JSON.stringify(gaps.slice(0, 30), null, 2));

const prodIds = [...new Set(gaps.map((g) => g.key.split("|")[1]))];
const { ObjectId } = await import("mongodb");
const products = await db.collection("products").find(
  { _id: { $in: prodIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } },
  { projection: { ProductName: 1, salesFlowRef: 1 } }
).toArray();
const names = Object.fromEntries(products.map((p) => [String(p._id), `${p.ProductName} (${p.salesFlowRef})`]));
for (const g of gaps) {
  const [store, pid] = g.key.split("|");
  console.log(names[pid] || pid, g);
}
await c.close();
