import fs from "fs";
import path from "path";
const srcRoot = path.join(process.cwd(), "src");
const skip = [/PdfDocument\.jsx$/i, /InvoiceTemplate\.jsx$/i, /Printable\.jsx$/i];
const reps = [
  ["w-full px-3 py-2 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500", "pd-input text-sm md:text-base"],
  ["px-3 py-2 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500", "pd-input text-sm md:text-base"],
  ["focus:outline-none focus:ring-2 focus:ring-blue-500", ""],
  ["focus:ring-2 focus:ring-blue-500", ""],
  ["focus:ring-blue-500", ""],
  ["px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm md:text-base", "pd-btn-save text-sm md:text-base"],
  ["px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm md:text-base", "pd-btn-save text-sm md:text-base"],
  ["px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600", "pd-btn-save"],
  ["px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600", "pd-btn-save"],
  ["px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition", "pd-btn-save"],
  ["px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600", "pd-btn-save"],
  ["px-4 py-2 bg-blue-400 text-white rounded", "pd-btn-save"],
  ["bg-blue-500 text-white px-6 py-2 rounded", "pd-btn-save"],
  ["bg-green-500 text-white px-4 py-2 rounded", "pd-btn-success px-4 py-2"],
  ["px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm md:text-base", "pd-btn-success px-4 py-2 text-sm md:text-base"],
  ["bg-red-500 text-white px-2 py-1 rounded", "pd-btn-icon-danger"],
  ["bg-red-500 text-white px-2 py-1 text-xs md:text-sm rounded hover:bg-red-600", "pd-btn-icon-danger text-xs md:text-sm"],
  ["px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition", "pd-btn-danger px-4 py-2"],
  ["px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600", "pd-btn-danger px-4 py-2"],
  ["text-red-500", "pd-stat-negative"],
  ["text-red-600", "pd-stat-negative"],
  ["text-green-600", "pd-stat-positive"],
  ["text-green-500", "pd-stat-positive"],
  ["bg-gray-700 text-white hover:bg-gray-800", "pd-btn-nav"],
  ["bg-gray-300 pd-text-muted cursor-not-allowed", "pd-btn-nav pd-btn-nav--disabled"],
  ["bg-gray-300 text-gray-500 cursor-not-allowed", "pd-btn-nav pd-btn-nav--disabled"],
  ["bg-gray-800", "pd-bg-readonly"],
  ["bg-gray-700", "pd-bg-readonly"],
  ["hover:bg-blue-50", ""],
  ["hover:bg-blue-100", ""],
  ["bg-blue-50", "pd-bg-muted"],
  ["bg-blue-100", "pd-bg-muted"],
  ["border-blue-500", "border-[color:var(--pd-primary)]"],
  ["ring-blue-500", ""],
];
function walk(d,f=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,f);else if(/\.jsx?$/.test(e.name))f.push(p);}return f;}
let n=0;
for(const file of walk(srcRoot)){
  if(skip.some(r=>r.test(file))) continue;
  let c=fs.readFileSync(file,"utf8"), o=c;
  for(const [a,b] of reps) c=c.split(a).join(b);
  c=c.replace(/className="([^"]*)"/g,(m,cls)=>{const x=cls.replace(/\s{2,}/g," ").trim();return x?`className="${x}"`:"";});
  if(c!==o){fs.writeFileSync(file,c);n++;}
}
console.log("Pass 2: "+n+" files");
