import { MongoClient } from "mongodb";

const c = new MongoClient("mongodb://localhost:27018/JafferSons");
await c.connect();
const db = c.db("JafferSons");
const names = (await db.listCollections().toArray()).map((n) => n.name);
console.log(names.filter((n) => /orderdc|purchase|salesinvoice|adjust|return|transfer/i.test(n)).join("\n"));

const num = (v) => {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

const dc = db.collection("orderdcs");
const dcDocs = await dc.find({}, { projection: { PostStatus: 1, DCCode: 1, DCDate: 1, Store: 1, DCData: 1 } }).toArray();
const statusBoxes = {};
let dcCollapse = 0;
const dcHits = [];
for (const d of dcDocs) {
  const st = String(d.PostStatus);
  const groups = new Map();
  for (const l of d.DCData || []) {
    const box = num(l.DeliveredBox);
    statusBoxes[st] = (statusBoxes[st] || 0) + box;
    const key = `${l.product}|${box}`;
    if (!groups.has(key)) groups.set(key, { box, n: 0, product: l.product });
    groups.get(key).n += 1;
  }
  if (!["Invoiced", "Deliverd"].includes(st)) continue;
  for (const g of groups.values()) {
    if (g.n < 2 || g.box === 0) continue;
    const dropped = g.box * (g.n - 1);
    dcCollapse += dropped;
    dcHits.push({ code: d.DCCode, date: d.DCDate, status: st, product: String(g.product), box: g.box, lines: g.n, dropped });
  }
}
dcHits.sort((a, b) => b.dropped - a.dropped);

const pr = db.collection("purchasereturns");
const prDocs = await pr.find({}, { projection: { PostStatus: 1, PurchaseReturn: 1, PurchaseReturnDate: 1, PurchaseReturnData: 1 } }).toArray();
let prTotal = 0, prBox = 0, prPostedFreshTotal = 0, prPostedFreshBox = 0;
const prDiffs = [];
for (const d of prDocs) {
  const posted = d.PostStatus === true || d.PostStatus === "true" || d.PostStatus === "True";
  for (const l of d.PurchaseReturnData || []) {
    const tb = num(l.totalBox);
    const b = num(l.box);
    prTotal += tb;
    prBox += b;
    if (posted && l.Condition === "Fresh") {
      prPostedFreshTotal += tb;
      prPostedFreshBox += b;
      if (tb !== b) prDiffs.push({ no: d.PurchaseReturn, date: d.PurchaseReturnDate, product: String(l.product), totalBox: tb, box: b, diff: tb - b });
    }
  }
}

const sr = db.collection("salesinvoicereturns");
const srDocs = await sr.find({}, { projection: { PostStatus: 1, Condition: 1, SalesReturnNumber: 1, SalesInvoiceReturnDate: 1, SalesReturnData: 1 } }).toArray();
let srOld = 0, srDist = 0;
for (const d of srDocs) {
  const posted = d.PostStatus === true || d.PostStatus === "true" || d.PostStatus === "True";
  const notFalse = d.PostStatus !== false && d.PostStatus !== "false" && d.PostStatus !== "False";
  const fresh = d.Condition !== "Damage";
  if (!fresh) continue;
  for (const l of d.SalesReturnData || []) {
    const tb = num(l.totalBox);
    const b = num(l.box);
    const distBox = Math.abs(tb) > 0 ? tb : b;
    if (notFalse) srOld += tb;
    if (posted) srDist += distBox;
  }
}

console.log(JSON.stringify({
  dcStatusBoxes: statusBoxes,
  dcCollapseInvoicedDelivered: dcCollapse,
  dcHits: dcHits.slice(0, 15),
  prAllTotalBox: prTotal,
  prAllBoxField: prBox,
  prPostedFreshTotalBox: prPostedFreshTotal,
  prPostedFreshBoxField: prPostedFreshBox,
  prFieldGap: prPostedFreshTotal - prPostedFreshBox,
  prDiffCount: prDiffs.length,
  prDiffs: prDiffs.slice(0, 20),
  salesReturnOldNotFalseTotalBox: srOld,
  salesReturnDistPosted: srDist,
  salesReturnGap: srOld - srDist,
}, null, 2));
await c.close();
