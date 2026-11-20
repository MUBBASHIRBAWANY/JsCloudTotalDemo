import mongoose from "mongoose";

await mongoose.connect("mongodb://localhost:27017/SND");
const db = mongoose.connection.db;
const dist = "6a670d9c08aa173c61b7c5de";
const rows = await db.collection("totalproducts").find({ Distrbutor: dist }).toArray();
const counts = new Map();
for (const r of rows) {
  const k = String(r.ProductName);
  counts.set(k, (counts.get(k) || 0) + 1);
}
const dups = [...counts.entries()].filter(([, n]) => n > 1);
console.log("dups for one dist", dups.length, dups.slice(0, 5));

const all = await db.collection("totalproducts").find({ Distrbutor: { $type: "string" } }).toArray();
const pair = new Map();
for (const r of all) {
  const k = `${r.Distrbutor}::${r.ProductName}`;
  pair.set(k, (pair.get(k) || 0) + 1);
}
const dupPairs = [...pair.values()].filter((n) => n > 1).length;
console.log("dup pairs", dupPairs, "rows", all.length);

await mongoose.disconnect();
