import fs from "fs";
import path from "path";
const roots = ["src/Components/Accounts", "src/Pages/Reports"].map((p) => path.join(process.cwd(), p));
function walk(d, f = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, f);
    else if (e.name.endsWith(".jsx")) f.push(p);
  }
  return f;
}
let n = 0;
for (const root of roots) {
  for (const file of walk(root)) {
    let c = fs.readFileSync(file, "utf8");
    const nc = c
      .replace(/\s*styles=\{\{\s*menuPortal:\s*\w+\s*=>\s*\(\{\s*\.\.\.\w+,\s*zIndex:\s*9999\s*\}\)\s*\}\}/g, "")
      .replace(/\s*styles=\{\{\s*control:\s*\((?:provided|base)\)\s*=>\s*\(\{\s*\.\.\.(?:provided|base),\s*minHeight:\s*['"]40px['"],\s*fontSize:\s*['"]14px['"]\s*\}\)\s*\}\}/g, "");
    if (nc !== c) {
      fs.writeFileSync(file, nc);
      n++;
    }
  }
}
console.log("Cleaned " + n);
