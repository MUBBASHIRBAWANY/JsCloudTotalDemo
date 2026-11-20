#!/usr/bin/env node
/**
 * Migrate report popups & print templates to Pearl Dynamic (pvt) ltdtheme classes.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { patchPdfFillColors } from '../src/theme/reportPdfTheme.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

const STYLE_KEY_TO_CLASS = {
  loader: 'pd-report-loader',
  exportLoader: 'pd-report-export-loader',
  exportLoaderContent: 'pd-report-export-loader-content',
  spinner: 'pd-report-spinner',
  filterSection: 'pd-report-filters',
  filterTitle: 'pd-report-filters-title',
  filterGrid: 'pd-report-filters-grid',
  filterGroup: 'pd-report-filters-group',
  filterLabel: 'pd-report-filters-label',
  filterInput: 'pd-report-filter-input',
  filterSelect: 'pd-report-filter-select',
  clearButton: 'pd-report-btn pd-report-btn-secondary',
  resultCount: 'pd-report-result-count',
  exportButtons: 'pd-report-toolbar',
  exportButton: 'pd-report-btn pd-report-btn-export',
  logo: 'pd-report-logo',
  container: 'pd-report-doc pd-report-doc--compact',
  ledgerContent: 'pd-report-body',
  ledgerHeader: 'pd-report-header',
  headerTop: 'pd-report-header-top',
  headerLeft: 'pd-report-header-left',
  headerRight: 'pd-report-header-right',
  logoPlaceholder: 'pd-report-logo-box',
  dateTime: 'pd-report-datetime',
  companyName: 'pd-report-company-name',
  ledgerTitle: 'pd-report-title',
  accountInfo: 'pd-report-meta',
  infoItem: 'pd-report-meta-item',
  infoLabel: 'pd-report-meta-label',
  infoValue: 'pd-report-meta-value',
  ledgerTableContainer: 'pd-report-table-scroll',
  ledgerTable: 'pd-report-table',
  tableHeader: '', // th inside pd-report-table
  tableRow: '',
  tableCell: '',
  amount: 'pd-report-amount',
  balance: 'pd-report-amount pd-report-amount-bold',
  voucherCell: 'pd-report-link',
  descriptionCell: 'pd-report-cell-ellipsis',
  totalLabel: 'pd-report-total-label',
  totalAmount: 'pd-report-total-amount',
  ledgerFooter: 'pd-report-footer',
  footerItem: 'pd-report-footer-item',
  signature: 'pd-report-signature',
  modalOverlay: 'pd-report-modal-overlay',
  modalContainer: 'pd-report-modal',
};

const TAILWIND_REPLACEMENTS = [
  [/className="border border-gray-400 px-2 py-1"/g, 'className="pd-report-table td"'],
  [/className="border border-gray-400 px-2 py-1 text-right"/g, 'className="pd-report-amount"'],
  [/className="bg-blue-200"/g, 'className=""'],
  [/className="bg-blue-600 text-white px-3 py-2 rounded-t font-semibold"/g, 'className="pd-report-summary-heading"'],
  [/className="bg-gray-300 px-3 py-2 rounded-t font-semibold"/g, 'className="pd-report-summary-heading"'],
  [/className="text-gray-700"/g, 'className="pd-text-muted"'],
  [/border border-gray-800/g, 'pd-print-table-cell'],
  [/border-gray-800/g, 'pd-print-border'],
  [/border-gray-600/g, 'pd-print-border-light'],
  [/bg-gray-50/g, 'pd-print-row-alt'],
  [/bg-white/g, 'pd-print-row'],
  [/border-black/g, 'pd-print-border-strong'],
  [/style=\{\{\s*color:\s*["']red["']\s*\}\}/g, 'className="pd-text-error"'],
  [/style=\{\{\s*color:\s*"red"\s*\}\}/g, 'className="pd-text-error"'],
];

function getRelativeThemeImport(filePath) {
  const fileDir = path.dirname(filePath);
  const themeDir = path.join(SRC, 'theme');
  let rel = path.relative(fileDir, themeDir).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function migrateLedgerStyles(content) {
  // style={styles.xxx} -> className="..."
  for (const [key, cls] of Object.entries(STYLE_KEY_TO_CLASS)) {
    if (cls === '') continue;
    const re = new RegExp(`style=\\{styles\\.${key}\\}`, 'g');
    content = content.replace(re, `className="${cls}"`);
  }

  // style={{ ...styles.a, ...styles.b }} patterns
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.tableCell,\s*\.\.\.styles\.amount,\s*color:\s*['"]#dc3545['"]\s*\}\}/g,
    'className="pd-report-amount pd-amount-debit"'
  );
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.tableCell,\s*\.\.\.styles\.amount,\s*color:\s*['"]#28a745['"]\s*\}\}/g,
    'className="pd-report-amount pd-amount-credit"'
  );
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.tableCell,\s*\.\.\.styles\.totalAmount,\s*color:\s*['"]#dc3545['"]\s*\}\}/g,
    'className="pd-report-total-amount pd-amount-debit"'
  );
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.tableCell,\s*\.\.\.styles\.totalAmount,\s*color:\s*['"]#28a745['"]\s*\}\}/g,
    'className="pd-report-total-amount pd-amount-credit"'
  );
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.tableCell,\s*\.\.\.styles\.descriptionCell\s*\}\}/g,
    'className="pd-report-cell-ellipsis"'
  );
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.tableCell,\s*\.\.\.styles\.voucherCell,\s*cursor:[^}]+\}\}/g,
    'className="pd-report-link"'
  );
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.tableCell,\s*\.\.\.styles\.amount,\s*\.\.\.styles\.balance\s*\}\}/g,
    'className="pd-report-amount pd-report-amount-bold"'
  );
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.tableCell,\s*\.\.\.styles\.totalLabel,\s*textAlign:\s*['"]right['"],\s*fontWeight:\s*['"]bold['"]\s*\}\}/g,
    'className="pd-report-total-label"'
  );
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.tableCell,\s*\.\.\.styles\.totalAmount,\s*fontWeight:\s*['"]bold['"]\s*\}\}/g,
    'className="pd-report-total-amount"'
  );
  content = content.replace(
    /style=\{\{[^}]*backgroundColor:\s*index\s*%\s*2\s*===\s*0\s*\?\s*['"]#f9fafc['"]\s*:\s*['"][^'"]+['"][^}]*\}\}/g,
    'className={index % 2 === 0 ? "pd-report-row-even" : ""}'
  );

  // Remove styles object and styleSheet injection
  content = content.replace(/\n\/\/ CSS-in-JS styles\nconst styles = \{[\s\S]*?\};\n\n/g, '\n');
  content = content.replace(/\n\/\/ Add keyframes for spin animation[\s\S]*?document\.head\.appendChild\(styleSheet\);\n\n/g, '\n');

  return content;
}

function removeStyleJsxBlocks(content) {
  // Remove <style jsx>{`...`}</style> and <style jsx> blocks
  content = content.replace(/<style jsx>\{`[\s\S]*?`\}<\/style>/g, '');
  content = content.replace(/<style jsx>\{[\s\S]*?\}<\/style>/g, '');
  content = content.replace(/<style>\{`[\s\S]*?`\}<\/style>/g, '');
  return content;
}

function wrapRootWithPopup(content) {
  // Add pd-report-popup to outer return div if not present
  if (content.includes('pd-report-popup')) return content;
  if (content.includes('const styles = {')) return content; // not yet migrated

  // report-container -> add pd-report-popup
  content = content.replace(
    /className="report-container"/g,
    'className="pd-report-popup report-container"'
  );
  content = content.replace(
    /className="sales-report-container"/g,
    'className="pd-report-popup sales-report-container"'
  );

  return content;
}

function addPdfImport(content, filePath) {
  if (!content.includes('jspdf') && !content.includes('jsPDF')) return content;
  if (content.includes('reportPdfTheme')) return content;

  const rel = getRelativeThemeImport(filePath);
  const importLine = `import { PDF_COLORS, pdfAutoTableDefaults } from '${rel}/reportPdfTheme.js';\n`;

  const lastImport = content.match(/^import .+$/gm);
  if (lastImport) {
    const last = lastImport[lastImport.length - 1];
    const idx = content.indexOf(last) + last.length;
    content = content.slice(0, idx + 1) + importLine + content.slice(idx + 1);
  }

  // Patch fillColor in autoTable calls
  content = patchPdfFillColors(content);

  // Inject defaults into autoTable if using bare autoTable(doc, { without headStyles
  content = content.replace(
    /autoTable\(doc,\s*\{/g,
    'autoTable(doc, { ...pdfAutoTableDefaults,'
  );

  return content;
}

function migratePrintTemplate(content) {
  content = content.replace(
    /className="font-sans text-xs"/,
    'className="pd-print-document font-sans text-xs"'
  );
  content = content.replace(
    /className="p-6 font-sans"/,
    'className="pd-print-document p-6 font-sans"'
  );
  content = content.replace(/<table className="min-w-full border-collapse border border-gray-800"/g,
    '<table className="pd-print-table min-w-full"');
  content = content.replace(/<table className="w-full border-collapse border border-gray-800/g,
    '<table className="pd-print-table w-full"');
  content = content.replace(/<table className="w-full border-collapse border border-gray-800 mb-4"/g,
    '<table className="pd-print-table w-full mb-4"');
  content = content.replace(/className="border border-gray-800 p-1/g, 'className="pd-print-table-cell p-1');
  content = content.replace(/className="border border-gray-600 p-1/g, 'className="pd-print-table-cell p-1');
  content = content.replace(/className=\{index % 2 === 0 \? 'bg-white' : 'bg-gray-50'\}/g,
    'className={index % 2 === 0 ? "pd-print-row" : "pd-print-row-alt"}');
  content = content.replace(/className="font-semibold border-t border-black pt-1 w-32"/g,
    'className="pd-print-signature-line"');
  content = content.replace(/className="text-center border-t border-black pt-4"/g,
    'className="pd-print-footer"');
  content = content.replace(/className="border-b-2 border-black/g, 'className="pd-print-total-line');
  content = content.replace(/className="border border-gray-800 p-2/g, 'className="pd-print-table-cell p-2');
  return content;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  content = migrateLedgerStyles(content);
  content = removeStyleJsxBlocks(content);
  content = wrapRootWithPopup(content);
  content = addPdfImport(content, filePath);

  for (const [re, rep] of TAILWIND_REPLACEMENTS) {
    content = content.replace(re, rep);
  }

  if (filePath.includes('InvoiceTemplate') || filePath.includes('PaymentVoucherPrintable')) {
    content = migratePrintTemplate(content);
  }

  // Upgrade simple loading states
  content = content.replace(
    /if \(loading\) return <div>Loading data\.\.\.<\/div>/g,
    'if (loading) return <div className="pd-report-popup loader-wrapper"><div className="pd-report-spinner" /><p>Loading data...</p></div>'
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function collectFiles() {
  const files = [];
  const reportsDir = path.join(SRC, 'Pages', 'Reports');
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('Popup.jsx')) files.push(full);
    }
  };
  walk(reportsDir);

  files.push(
    path.join(SRC, 'Components', 'SalesInvoice', 'InvoiceTemplate.jsx'),
    path.join(SRC, 'Components', 'Distrbutor', 'DistrbutorInvoice', 'InvoiceTemplate.jsx'),
    path.join(SRC, 'Components', 'Accounts', 'Vouchers', 'CashPaymentVoucher', 'PaymentVoucherPrintable.jsx'),
    path.join(SRC, 'Components', 'Accounts', 'Vouchers', 'BankPaymentVoucher', 'PaymentVoucherPrintable.jsx'),
  );

  return files;
}

const files = collectFiles();
let changed = 0;
for (const f of files) {
  if (processFile(f)) {
    changed++;
    console.log('✓', path.relative(SRC, f));
  }
}
console.log(`\nMigrated ${changed} / ${files.length} files`);