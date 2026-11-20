import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', 'src', 'Components');

const dirs = [
  'SalesInvoice',
  'PurchaseInvoice',
  'PurchaseReturn',
  'SalesInvoiceReturn',
  'TransferOut',
  'StockReplacement',
  'SaleOrder',
  'OrderDC',
];

const controlStylesRe =
  /\s*styles=\{\{\s*control:\s*\((?:provided|base)\)\s*=>\s*\(\{\s*\.\.\.(?:provided|base),\s*minHeight:\s*['"]40px['"],\s*fontSize:\s*['"]14px['"]\s*\}\)\s*\}\}/g;

const replacements = [
  ['text-xl font-semibold text-gray-800', 'pd-page-title'],
  ['className="basic-single text-sm"', 'className="basic-single" compact'],
  ['<AppSelect compact compact', '<AppSelect compact'],
  ['<AppAsyncSelect compact compact', '<AppAsyncSelect compact'],
];

function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, files);
    else if (entry.name.endsWith('.jsx')) files.push(full);
  }
  return files;
}

let fixed = 0;

for (const dir of dirs) {
  for (const file of walkDir(path.join(root, dir))) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    content = content.replace(controlStylesRe, '');

    for (const [from, to] of replacements) {
      content = content.split(from).join(to);
    }

    // Add compact to AppSelect/AppAsyncSelect with basic-single but missing compact
    content = content.replace(
      /<(AppSelect|AppAsyncSelect)(?![^>]*\bcompact\b)([^>]*className="basic-single")/g,
      '<$1 compact$2',
    );

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      fixed++;
    }
  }
}

console.log(`Wave 4 cleanup: ${fixed} files fixed`);