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

const replacements = [
  ['text-3xl font-bold text-center  text-gray-800 mb-6', 'pd-page-title text-center mb-6'],
  ['text-3xl font-bold text-center text-gray-800 mb-6', 'pd-page-title text-center mb-6'],
  ['text-3xl font-bold text-center text-gray-800 mb-4', 'pd-page-title text-center mb-4'],
  ['text-2xl font-bold text-gray-800 text-center mb-6', 'pd-page-title text-center mb-6'],
  ['text-2xl font-bold text-gray-800 mb-6', 'pd-page-title mb-6'],
  ['text-2xl font-bold text-gray-800', 'pd-page-title'],
  ['text-2xl font-bold mb-2', 'pd-page-title mb-2'],
  ['text-xl md:text-2xl font-bold text-gray-800 text-center mb-6', 'pd-page-title text-center mb-6'],
  ['text-xl md:text-2xl font-bold text-gray-800 mb-6', 'pd-page-title mb-6'],
  ['text-xl md:text-2xl font-bold text-center text-gray-800 mb-6', 'pd-page-title text-center mb-6'],
  ['text-xl font-bold text-gray-800 text-center mb-6', 'pd-page-title text-center mb-6'],
  ['text-xl font-bold text-gray-800 mb-6', 'pd-page-title mb-6'],
  ['block text-gray-700 font-semibold mb-2', 'pd-label'],
  ['block text-sm font-medium text-gray-700 mb-2', 'pd-label'],
  ['block text-sm font-medium text-gray-700 mb-1', 'pd-label'],
  ['block text-sm font-medium text-gray-700', 'pd-label'],
  ['block text-sm font-semibold text-gray-700 mb-1', 'pd-label'],
  ['block text-sm font-semibold text-gray-700', 'pd-label'],
  ['block text-sm font-semibold text-gray-600 mb-1', 'pd-label'],
  ['block text-sm font-semibold text-gray-600', 'pd-label'],
  ['text-sm font-medium text-gray-700 mb-1', 'pd-label mb-1'],
  ['text-sm font-medium text-gray-700', 'pd-label'],
  ['block text-sm md:text-base text-gray-700 font-semibold mb-2', 'pd-label'],
  [
    'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
    'pd-input',
  ],
  [
    'w-full px-3 py-2 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
    'pd-input',
  ],
  [
    'w-full h-[40px] px-3 border rounded-lg focus:ring-2 focus:ring-blue-500',
    'pd-input',
  ],
  [
    'w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500',
    'pd-input',
  ],
  ['w-full border border-gray-300 rounded-md px-3 py-2', 'pd-input'],
  [
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
    'pd-input',
  ],
  [
    'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-6 rounded-lg shadow-md mb-6',
    'pd-form-grid lg:grid-cols-4 mb-6',
  ],
  [
    'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white p-6 rounded-lg shadow-md mb-6',
    'pd-form-grid mb-6',
  ],
  [
    'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white p-6 rounded-lg shadow-md',
    'pd-form-grid',
  ],
  [
    'grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg shadow-md',
    'pd-form-grid',
  ],
  [
    'grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-lg shadow-md',
    'pd-form-grid gap-4',
  ],
  ['bg-white p-4 md:p-6 rounded-lg shadow-md', 'pd-card p-4 md:p-6'],
  ['bg-white p-6 rounded-lg shadow-md', 'pd-card p-6'],
  ['bg-white p-4 rounded-lg shadow-md', 'pd-card p-4'],
  [
    'px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500',
    'pd-btn-save',
  ],
  ['px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600', 'pd-btn-save'],
  ['px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600', 'pd-btn-save'],
  ['bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700', 'pd-btn-save'],
  ['bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700', 'pd-btn-save px-6'],
  ['bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700', 'pd-btn-save'],
  [
    'mr-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300',
    'pd-btn-outline mr-4',
  ],
  [
    'className="h-[70vh] w-full overflow-x-auto"',
    'className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto"',
  ],
  [
    'className="h-[70vh] w-full"',
    'className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto"',
  ],
  ['min-w-full divide-y divide-gray-200 bg-white', 'pd-data-table min-w-full'],
  ['<thead className="bg-gray-50">', '<thead>'],
  ['<tr className="bg-gray-100">', '<tr>'],
  ['className="hover:bg-gray-50"', ''],
  ["className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}", ''],
  ["className=\"mx-5\"", 'className="pd-page"'],
  ['whitespace-nowrap px-6 py-4 text-sm text-gray-700', 'whitespace-nowrap px-6 py-4 text-sm'],
  ['classNamePrefix="react-select"', 'classNamePrefix="pd-select"'],
  ['classNamePrefix="select"', 'classNamePrefix="pd-select"'],
  ['className="react-select-container"', ''],
];

function getGlobalImportPath(filePath) {
  const rel = path.relative(root, path.dirname(filePath));
  const depth = rel.split(path.sep).filter(Boolean).length;
  return `${'../'.repeat(depth)}Global/AppSelect.jsx`;
}

function stripSelectBoilerplate(content) {
  content = content.replace(/\s*menuPortalTarget=\{document\.body\}/g, '');
  content = content.replace(/\s*menuPortalTarget=\{typeof document[^}]+\}/g, '');

  content = content.replace(
    /\s*styles=\{\{\s*menuPortal:\s*(?:base|provided)\s*=>\s*\(\{\s*\.\.\.(?:base|provided),\s*zIndex:\s*9999\s*\}\)\s*(?:,\s*control:\s*\((?:base|provided)\)\s*=>\s*\(\{[\s\S]*?\}\)\s*)?\}\}/g,
    '',
  );
  content = content.replace(
    /\s*styles=\{\{\s*menuPortal:\s*(?:base|provided)\s*=>\s*\(\{\s*\.\.\.(?:base|provided),\s*zIndex:\s*9999\s*\}\)\s*\}\}/g,
    '',
  );
  content = content.replace(
    /\s*styles=\{\{\s*menuPortal:\s*\(base\)\s*=>\s*\(\{\s*\.\.\.base,\s*zIndex:\s*9999\s*\}\)\s*\}\}/g,
    '',
  );
  content = content.replace(
    /\s*styles=\{\{\s*control:\s*\((?:provided|base)\)\s*=>\s*\(\{[\s\S]*?borderColor:\s*['"]#[0-9a-fA-F]{3,8}['"][\s\S]*?\}\)\s*,\s*option:\s*\((?:provided|base)\)\s*=>\s*\(\{[\s\S]*?\}\)\s*,?\s*\}\}/g,
    '',
  );

  return content;
}

function migrateReactSelect(content, filePath) {
  const hasSelect = /import\s+Select\s+from\s+['"]react-select['"]/.test(content);
  const hasAsync = /import\s+AsyncSelect\s+from\s+['"]react-select\/async['"]/.test(content);
  if (!hasSelect && !hasAsync) return { content, migrated: false };

  const importPath = getGlobalImportPath(filePath);

  if (hasSelect) {
    content = content.replace(
      /import\s+Select\s+from\s+['"]react-select['"]\s*;?\s*\n?/,
      `import AppSelect from '${importPath}'\n`,
    );
    content = content.replace(/<Select\b/g, '<AppSelect');
    content = content.replace(/<\/Select>/g, '</AppSelect>');
  }

  if (hasAsync) {
    const asyncPath = importPath.replace('AppSelect.jsx', 'AppAsyncSelect.jsx');
    content = content.replace(
      /import\s+AsyncSelect\s+from\s+['"]react-select\/async['"]\s*;?\s*\n?/,
      `import AppAsyncSelect from '${asyncPath}'\n`,
    );
    content = content.replace(/<AsyncSelect\b/g, '<AppAsyncSelect');
    content = content.replace(/<\/AsyncSelect>/g, '</AppAsyncSelect>');
  }

  content = stripSelectBoilerplate(content);
  content = content.replace(/<AppSelect\b([^>]*)\bclassName="text-sm"/g, '<AppSelect compact$1');
  content = content.replace(/<AppAsyncSelect\b([^>]*)\bclassName="text-sm"/g, '<AppAsyncSelect compact$1');
  content = content.replace(/<AppSelect compact compact/g, '<AppSelect compact');
  content = content.replace(/<AppAsyncSelect compact compact/g, '<AppAsyncSelect compact');

  return { content, migrated: true };
}

function fixListPageClosing(content) {
  if (!content.includes('pd-card pd-list-grid')) return content;
  const exportIdx = content.lastIndexOf('\nexport default');
  const returnIdx = content.lastIndexOf('return (', exportIdx);
  if (returnIdx === -1 || exportIdx === -1) return content;

  const tail = content.slice(returnIdx, exportIdx);
  const opens = (tail.match(/className="pd-page"><div/g) || []).length;
  const closes = (tail.match(/<\/div>/g) || []).length;
  if (opens > 0 && closes === opens) {
    const insertAt = content.lastIndexOf('</div>', exportIdx);
    content = `${content.slice(0, insertAt)}</div>${content.slice(insertAt)}`;
  }
  return content;
}

function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, files);
    else if (entry.name.endsWith('.jsx')) files.push(full);
  }
  return files;
}

let updated = 0;
let selectMigrated = 0;

for (const dir of dirs) {
  const fullDir = path.join(root, dir);
  const files = walkDir(fullDir);

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    for (const [from, to] of replacements) {
      content = content.split(from).join(to);
    }

    const { content: next, migrated } = migrateReactSelect(content, file);
    content = next;
    if (migrated) selectMigrated++;

    content = fixListPageClosing(content);

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      updated++;
    }
  }
}

console.log(`Wave 4 migration: ${updated} files updated, ${selectMigrated} react-select migrations`);