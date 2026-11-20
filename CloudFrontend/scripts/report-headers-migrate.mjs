#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');
const REPORTS = path.join(SRC, 'Pages', 'Reports');

const PAGE_TITLES = {
  AllStock: 'All Stock',
  StockReportFlowReport: 'Stock Flow Report',
  InventoryValutionReport: 'Inventory Valuation',
  InventoryValutionByProduct: 'Inventory Valuation Summary',
  Genrallager: 'General Ledger',
  InvoiceAging: 'Invoice Aging',
  SalesInvoiceSummry: 'Sales Invoice Summary',
  DailySalesReport: 'Daily Sales Report',
  TrailBalance: 'Trial Balances',
  ClientLedger: 'Client Ledger',
  InvestmentReport: 'Investment Report',
  PurchaseReport: 'Purchase Report',
  SalesDumpData: 'Sales Dump Data',
  TransferInReport: 'Transfer In Report',
  TaxReport: 'Tax Report',
  ChqTransictionReport: 'Cheque Transaction Report',
  StoreLedger: 'Store Ledger',
  Storeledger: 'Store Ledger',
  SundryDebtorBalance: 'Sundry Debtor Balance',
  PaymentRealizeReport: 'Payment Realize Report',
  DcReport: 'Order Management',
  RemainKnokoff: 'Knockoff Remaining',
  BoorWiseClientLedger: 'Booker Wise Ledger',
  TransporterLedger: 'Transporter Ledger',
  CustomerAndOrderBookerWiseInvoice: 'Order Booker Wise Invoice',
  AttandanceReport: 'Booker Attendance Report',
  LogReport: 'Activity Log Report',
  OrderBookerAchivment: 'Order Booker Achievement',
  RCReport: 'RC Report',
  CashBook: 'Cash Book',
  ClientBalanceSummry: 'Client Balance Summary',
  SalesInvoiceDumpData: 'Sales Invoice Dump Data',
  PurchaseDumpData: 'Purchase Dump Data',
  SalesDumpDataPopup: 'Sales Dump Data',
};

const POPUP_TITLES = {
  CashBookPopup: 'Cash Book',
  ClientLedgerPopup: 'Client Ledger',
  GenrallagerPopup: 'General Ledger',
  TrailBalancePopup: 'Trial Balances',
  PaymentRealizeReportPopup: 'Payment Realize Report',
  TransporterLedgerPopup: 'Transporter Ledger',
  BoorWiseClientLedgerPopup: 'Booker Wise Ledger',
  InvestmentReportPopup: 'Investment Report',
  DailySalesReportPopup: 'Daily Sales Report',
  SalesInvoiceSummryPopup: 'Sales Invoice Summary',
  SalesInvoiceSummryWithOutCalPopup: 'Sales Invoice Summary',
  SalesDumpDataPopup: 'Sales Dump Data',
  PurchaseReportPopup: 'Purchase Report',
  PurchaseDumpDataPopup: 'Purchase Dump Data',
  TaxReportPopup: 'Tax Report',
  InvoiceAgingPopup: 'Invoice Aging',
  SundryDebtorBalancePopup: 'Sundry Debtor Balance',
  StoreledgerPopup: 'Store Ledger',
  StockFlowReportPopup: 'Stock Flow Report',
  InventoryValutionReportPopup: 'Inventory Valuation',
  TransferInReportPopup: 'Transfer In Report',
  CustomerAndOrderBookerWiseInvoicePopup: 'Order Booker Wise Invoice',
  ChqTransictionReportPopup: 'Cheque Transaction Report',
  OrderBookerAchivmentPopup: 'Order Booker Achievement',
  RCReportPopup: 'RC Report',
  LogReportPopup: 'Activity Log Report',
  SalesInvoiceDumpDataPopup: 'Sales Invoice Dump Data',
};

const PAGE_SKIP = /Popup|Summry|ProductSummry|WithOutCal/i;

function relImport(filePath, targetDir) {
  let rel = path.relative(path.dirname(filePath), targetDir).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function addImport(content, filePath, component) {
  if (content.includes(component)) return content;
  const rel = relImport(filePath, path.join(SRC, 'Components', 'Global'));
  const line = `import ${component} from '${rel}/${component}.jsx';\n`;
  const imports = content.match(/^import .+$/gm);
  if (!imports) return line + content;
  const last = imports[imports.length - 1];
  const idx = content.indexOf(last) + last.length;
  return content.slice(0, idx + 1) + line + content.slice(idx + 1);
}

function migratePage(filePath, content) {
  const base = path.basename(filePath, '.jsx');
  if (PAGE_SKIP.test(base)) return content;
  const title = PAGE_TITLES[base];
  if (!title || content.includes('ReportPageLayout')) return content;

  content = addImport(content, filePath, 'ReportPageLayout');

  if (content.match(/return \(\s*\n\s*<>/)) {
    content = content.replace(
      /return \(\s*\n\s*<>/,
      `return (\n    <ReportPageLayout title="${title}">\n        <>`
    );
    const closeIdx = content.lastIndexOf('</>');
    if (closeIdx !== -1) {
      content = content.slice(0, closeIdx + 4) + '\n    </ReportPageLayout>' + content.slice(closeIdx + 4);
    }
    return content;
  }

  if (content.match(/return \(\s*\n\s*<div/)) {
    content = content.replace(
      /return \(\s*\n(\s*)<div/,
      `return (\n$1<ReportPageLayout title="${title}">\n$1<div`
    );
    content = content.replace(
      /\n(\s*)\)\s*;\s*\n\};\s*\n\nexport default/,
      `\n$1</ReportPageLayout>\n$1);\n};\n\nexport default`
    );
    return content;
  }

  return content;
}

function migratePopup(filePath, content) {
  const base = path.basename(filePath, '.jsx');
  const title = POPUP_TITLES[base];
  if (!title || content.includes('ReportPopupHeader')) return content;

  content = addImport(content, filePath, 'ReportPopupHeader');

  if (content.includes(`<ReportPopupHeader title="${title}"`)) return content;

  const header = `<ReportPopupHeader title="${title}" />\n`;

  const patterns = [
    [/return \(\s*\n\s*<div([^>]*className="[^"]*container[^"]*"[^>]*)>/, (m, attrs) => `return (\n    <div${attrs}>\n      ${header}`],
    [/return \(\s*\n\s*<div([^>]*style=\{styles\.container\}[^>]*)>/, (m, attrs) => `return (\n    <div${attrs}>\n      ${header}`],
    [/return \(\s*\n\s*<>/, () => `return (\n    <>\n      ${header}`],
    [/return \(\s*\n\s*<div/, () => `return (\n    <div>\n      ${header}`],
  ];

  for (const [re, repl] of patterns) {
    if (re.test(content)) {
      content = content.replace(re, repl);
      return content;
    }
  }

  return content;
}

function walk(dir, filter) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, filter));
    else if (e.name.endsWith('.jsx') && filter(full)) out.push(full);
  }
  return out;
}

const pages = walk(REPORTS, (f) => !f.includes('Popup.jsx') && !PAGE_SKIP.test(path.basename(f)));
const popups = walk(REPORTS, (f) => f.endsWith('Popup.jsx'));

let changed = 0;
for (const f of [...pages, ...popups]) {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  c = f.endsWith('Popup.jsx') ? migratePopup(f, c) : migratePage(f, c);
  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8');
    changed++;
    console.log('✓', path.relative(SRC, f));
  }
}
console.log(`\nUpdated ${changed} files`);