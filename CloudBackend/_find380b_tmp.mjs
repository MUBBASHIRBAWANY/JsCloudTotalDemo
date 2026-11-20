import { MongoClient } from "mongodb";

const c = new MongoClient("mongodb://localhost:27018/JafferSons");
await c.connect();
const db = c.db("JafferSons");

async function findQty(col, arrayPath, fields, extraProject = {}) {
  const facets = {};
  for (const f of fields) {
    facets[f] = [
      { $match: { [`${arrayPath}.${f}`]: { $in: [380, "380", -380, "-380"] } } },
      { $unwind: `$${arrayPath}` },
      { $match: { [`${arrayPath}.${f}`]: { $in: [380, "380", -380, "-380"] } } },
      { $project: { _id: 0, ...extraProject, field: { $literal: f }, qty: `$${arrayPath}.${f}`, product: { $ifNull: [`$${arrayPath}.product`, `$${arrayPath}.productName`] } } },
      { $limit: 20 },
    ];
  }
  const [row] = await db.collection(col).aggregate([{ $facet: facets }]).toArray();
  const hits = Object.values(row).flat();
  console.log(col, hits.length ? JSON.stringify(hits, null, 2) : "none");
}

await findQty("salesinvoices", "SalesData", ["totalBox"], { invoice: "$InvoiceNo", date: "$SalesInvoiceDate", status: "$PostStatus", store: "$Store" });
await findQty("stockadjustments", "AdjustmentData", ["addBox", "lessBox"], { date: "$AdjustmentDate", status: "$PostStatus", store: "$Store" });
await findQty("inventorytransferouts", "TransferData", ["totalBox"], { date: "$TransferOutDate", status: "$PostStatus", code: "$TransferCode" });
await findQty("inventorytransferins", "TransferData", ["totalBox"], { date: "$TransferInDate", status: "$PostStatus", code: "$TransferCode" });
await findQty("stockreplacements", "ReplacementData", ["totalBoxesFrom", "totalBoxesTo"], { date: "$ReplacementDate", status: "$PostStatus", store: "$Store" });
await findQty("orderdcs", "DCData", ["DeliveredBox", "OrderBox", "totalBox"], { code: "$DCCode", date: "$DCDate", status: "$PostStatus", store: "$Store" });

const opening = db.collection("openinginventories");
const names = (await db.listCollections().toArray()).map((n) => n.name).filter((n) => /open/i.test(n));
console.log("opening collections", names);
await c.close();
