import fs from "fs";
import path from "path";
const srcRoot = path.join(process.cwd(), "src");
const skip = [/PdfDocument\.jsx$/i, /InvoiceTemplate\.jsx$/i, /Printable\.jsx$/i];
const reps = [
  ["bg-blue-600 text-white px-4 py-1 rounded-lg hover:bg-blue-700 transition-colors", "pd-btn-save px-4 py-1"],
  ["bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors", "pd-btn-save"],
  ["px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", "pd-btn-save"],
  ["bg-black bg-opacity-50", "pd-modal-overlay"],
  ["bg-black/50", "pd-modal-overlay"],
  ["fixed inset-0 bg-gray-600 bg-opacity-50", "fixed inset-0 pd-modal-overlay"],
  ["fixed inset-0 bg-gray-500 bg-opacity-75", "fixed inset-0 pd-modal-overlay"],
  ["bg-opacity-50 flex items-center justify-center z-50", "pd-modal-overlay flex items-center justify-center z-50"],
  ["text-gray-300 hover:text-white", "pd-text-muted hover:pd-text-body"],
  ["border-gray-600", "pd-border-default border"],
  ["divide-gray-200", "divide-[color:var(--pd-border-card)]"],
  ["divide-y divide-gray-200", "divide-y divide-[color:var(--pd-border-card)]"],
];
function walk(d,f=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,f);else if(/\.jsx?$/.test(e.name))f.push(p);}return f;}
let n=0;
for(const file of walk(srcRoot)){
  if(skip.some(r=>r.test(file))) continue;
  let c=fs.readFileSync(file,"utf8"), o=c;
  for(const [a,b] of reps) c=c.split(a).join(b);
  if(c!==o){fs.writeFileSync(file,c);n++;}
}
console.log("Pass 3: "+n);
