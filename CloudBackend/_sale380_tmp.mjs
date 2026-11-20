import { MongoClient, ObjectId } from "mongodb";

const c = new MongoClient("mongodb://localhost:27018/JafferSons");
await c.connect();
const db = c.db("JafferSons");
const pid = "685b98d0b6de055fd670fa8c";
const num = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

const sales = await db.collection("salesinvoices").aggregate([
  { $match: { PostStatus: true } },
  { $unwind: "$SalesData" },
  { $match: { "SalesData.product": pid, "SalesData.totalBox": 380 } },
  { $project: { SalesInvoice: 1, SalesInvoiceDate: 1, Store: 1, Client: 1, totalBox: "$SalesData.totalBox", SalesFlowRef: 1 } },
]).toArray();

const product = await db.collection("products").findOne({ _id: new ObjectId(pid) }, { projection: { ProductName: 1, salesFlowRef: 1 } });
const store = await db.collection("stores").findOne({ _id: new ObjectId("6854edbcf31562c896094387") }, { projection: { StoreName: 1 } });

const dcs = await db.collection("orderdcs").aggregate([
  { $unwind: "$DCData" },
  { $match: { "DCData.product": pid, Store: "6854edbcf31562c896094387" } },
  { $project: { DCCode: 1, DCDate: 1, PostStatus: 1, DeliveredBox: "$DCData.DeliveredBox" } },
]).toArray();

const dcSum = {};
for (const d of dcs) {
  const st = String(d.PostStatus);
  dcSum[st] = (dcSum[st] || 0) + num(d.DeliveredBox);
}

const saleSum = await db.collection("salesinvoices").aggregate([
  { $match: { PostStatus: true, Store: "6854edbcf31562c896094387" } },
  { $unwind: "$SalesData" },
  { $match: { "SalesData.product": pid } },
  { $group: { _id: null, boxes: { $sum: { $toDouble: "$SalesData.totalBox" } }, n: { $sum: 1 } } },
]).toArray();

console.log(JSON.stringify({ product, store, sales, dcSum, saleSum, dcLines: dcs.filter((d) => num(d.DeliveredBox) !== 0).slice(0, 30), dcLineCount: dcs.length }, null, 2));
await c.close();
