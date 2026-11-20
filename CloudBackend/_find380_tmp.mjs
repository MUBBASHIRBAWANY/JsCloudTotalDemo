import { MongoClient } from "mongodb";

const c = new MongoClient("mongodb://localhost:27018/JafferSons");
await c.connect();
const db = c.db("JafferSons");
const num = (v) => {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

const scan = async (colName, dateField, arrayField, qtyFields) => {
  const col = db.collection(colName);
  const n = await col.estimatedDocumentCount();
  if (!n) return;
  const docs = await col.find({}).toArray();
  const hits = [];
  for (const d of docs) {
    const lines = arrayField ? (d[arrayField] || []) : [d];
    for (const l of lines) {
      for (const f of qtyFields) {
        const q = num(l?.[f]);
        if (q === 380 || q === -380) {
          hits.push({
            col: colName,
            code: d.DCCode || d.RcCode || d.PurchaseInvoice || d.InvoiceNo || d.TransferCode || d.AdjustmentCode || d.PurchaseReturn || d.SalesReturnNumber || d._id,
            date: d[dateField],
            status: d.PostStatus,
            field: f,
            product: l.product || l.productName || l.Product,
          });
        }
      }
    }
  }
  if (hits.length) console.log(colName, JSON.stringify(hits, null, 2));
  else console.log(colName, "no 380 in", qtyFields.join(","), "docs", docs.length);
};

await scan("orderdcs", "DCDate", "DCData", ["DeliveredBox", "totalBox", "box"]);
await scan("saleorderdcs", "DCDate", "DCData", ["DeliveredBox", "totalBox", "box"]);
await scan("rcs", "RcDate", "RcData", ["totalBox", "box"]);
await scan("purchaseinvoices", "PurchaseInvoiceDate", "PurchaseData", ["totalBox", "box"]);
await scan("salesinvoices", "SalesInvoiceDate", "SalesData", ["totalBox", "box"]);
await scan("salesinvoicereturns", "SalesInvoiceReturnDate", "SalesReturnData", ["totalBox", "box"]);
await scan("purchasereturns", "PurchaseReturnDate", "PurchaseReturnData", ["totalBox", "box"]);
await scan("stockadjustments", "AdjustmentDate", "AdjustmentData", ["addBox", "lessBox"]);
await scan("stockreplacements", "ReplacementDate", "ReplacementData", ["totalBoxesFrom", "totalBoxesTo"]);
await scan("inventorytransferouts", "TransferOutDate", "TransferData", ["totalBox", "box"]);
await scan("inventorytransferins", "TransferInDate", "TransferData", ["totalBox", "box"]);

await c.close();
