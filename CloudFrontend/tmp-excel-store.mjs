import { createRequire } from "module";
const require = createRequire("D:/Total Software/JaffarSons/JSERP-Backend/package.json");
const { MongoClient } = require("mongodb");
const client = new MongoClient("mongodb://localhost:27017");
await client.connect();
const db = client.db("JafferSons");
const voucher = await db.collection("vouchers").findOne({ VoucherNumber: "JV2026090045" });
console.log("voucher", voucher ? voucher._id : "none", voucher?.Remarks);
const stores = await db.collection("stores").find({}).toArray();
const nameOf = (id) => {
    if (!id || id === "0") return "Head Office";
    const hit = stores.find((store) => String(store._id) === String(id));
    return hit ? hit.StoreName : String(id);
};
if (voucher) {
    const lines = voucher.VoucharData || [];
    const groups = new Map();
    for (const line of lines) {
        const key = `${line.store || ""}`;
        groups.set(key, (groups.get(key) || 0) + 1);
    }
    console.log("line count", lines.length);
    for (const [store, count] of groups) console.log(count, nameOf(store));
    const salary = lines.filter((line) => /salar|advance|ebf exp/i.test(line.Narration || "") && !line.EBF && !line.Loan).slice(0, 15);
    for (const line of salary) console.log(nameOf(line.store), line.Debit, line.Credit, line.Narration);
}
await client.close();
