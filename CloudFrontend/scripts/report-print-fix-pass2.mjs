#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

function fixLedgerPopups(content) {
  content = content.replace(/style=\{styles\.tableHeader\}/g, '');
  content = content.replace(/style=\{styles\.tableCell\}/g, '');
  content = content.replace(/style=\{styles\.amountCell\}/g, 'className="pd-report-amount"');

  content = content.replace(/style=\{styles\.clientNavigation\}/g, 'className="pd-report-client-nav"');
  content = content.replace(/style=\{styles\.navButton\}/g, 'className="pd-report-client-nav-btn"');
  content = content.replace(/style=\{styles\.clientInfo\}/g, 'className="pd-report-client-info"');
  content = content.replace(/style=\{styles\.clientCounter\}/g, 'className="pd-report-client-counter"');
  content = content.replace(/style=\{styles\.clientName\}/g, 'className="pd-report-client-name"');
  content = content.replace(/style=\{styles\.clientStats\}/g, 'className="pd-report-client-stats"');

  // Remove any remaining styles objects (various comment prefixes)
  content = content.replace(/\n\/\/[^\n]*[Ss]tyles[^\n]*\nconst styles = \{[\s\S]*?\};\n\n/g, '\n');
  content = content.replace(/\nconst styles = \{[\s\S]*?\};\n\nexport default/g, '\n\nexport default');

  return content;
}

function fixLogReport(content) {
  if (!content.includes('LogReportPopup')) return content;

  const map = [
    ['styles.errorContainer', 'pd-log-report__error'],
    ['styles.errorIcon', ''],
    ['styles.errorTitle', ''],
    ['styles.errorMessage', 'pd-text-muted'],
    ['styles.retryButton', 'pd-report-btn pd-report-btn-primary'],
    ['styles.page', 'pd-report-popup pd-log-report'],
    ['styles.header', 'pd-log-report__header'],
    ['styles.headerAccent', 'pd-log-report__header-accent'],
    ['styles.headerContent', 'pd-log-report__header-content'],
    ['styles.companyInfo', ''],
    ['styles.companyAddress', 'pd-text-muted'],
    ['styles.reportBadgeContainer', ''],
    ['styles.reportBadge', 'pd-log-report__badge'],
    ['styles.reportDetails', ''],
    ['styles.reportMeta', 'pd-log-report__meta'],
    ['styles.statsGrid', 'pd-log-report__stats'],
    ['styles.statCard', 'pd-log-report__stat-card'],
    ['styles.statLabel', 'pd-log-report__stat-label'],
    ['styles.controls', 'pd-log-report__controls'],
    ['styles.searchContainer', 'pd-log-report__search-wrap'],
    ['styles.searchIcon', 'pd-log-report__search-icon'],
    ['styles.searchInput', 'pd-log-report__search'],
    ['styles.recordCount', 'pd-log-report__record-count'],
    ['styles.spacer', 'pd-log-report__spacer'],
    ['styles.buttonGroup', 'pd-log-report__btn-group'],
    ['styles.tableWrapper', 'pd-log-report__table-wrap'],
    ['styles.loadingState', 'pd-log-report__state'],
    ['styles.emptyState', 'pd-log-report__state'],
    ['styles.emptyTitle', ''],
    ['styles.emptyDescription', 'pd-text-muted'],
    ['styles.refreshButton', 'pd-report-btn pd-report-btn-secondary'],
    ['styles.table', 'pd-log-report__table'],
    ['styles.tdIndex', 'pd-text-muted text-center'],
    ['styles.td', ''],
    ['styles.tdDate', 'pd-text-muted whitespace-nowrap'],
    ['styles.voucherCode', 'pd-log-report__voucher-code'],
    ['styles.userCell', 'pd-log-report__user-cell'],
    ['styles.userAvatar', 'pd-log-report__avatar'],
    ['styles.userName', ''],
    ['styles.footer', 'pd-log-report__footer'],
  ];

  for (const [from, cls] of map) {
    const re = new RegExp(`style=\\{${from.replace('.', '\\.')}\\}`, 'g');
    content = content.replace(re, cls ? `className="${cls}"` : '');
  }

  // statValue with color spread
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.statValue,\s*color:\s*stat\.color\s*\}\}/g,
    'className="pd-log-report__stat-value" style={{ color: stat.color }}'
  );

  // Button style spreads
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.button,\s*\.\.\.styles\.excelButton,\s*\.\.\.filteredLogs\.length === 0 \? styles\.buttonDisabled : \{\},\s*\}\}/g,
    'className="pd-log-report__btn pd-log-report__btn--excel" disabled={filteredLogs.length === 0}'
  );
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.button,\s*\.\.\.styles\.pdfButton,\s*\.\.\.filteredLogs\.length === 0 \? styles\.buttonDisabled : \{\},\s*\}\}/g,
    'className="pd-log-report__btn pd-log-report__btn--pdf" disabled={filteredLogs.length === 0}'
  );
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.button,\s*\.\.\.styles\.printButton,\s*\.\.\.filteredLogs\.length === 0 \? styles\.buttonDisabled : \{\},\s*\}\}/g,
    'className="pd-log-report__btn pd-log-report__btn--print" disabled={filteredLogs.length === 0}'
  );

  // th with width
  content = content.replace(
    /style=\{\{\s*\.\.\.styles\.th,\s*width:\s*'[^']+'\s*\}\}/g,
    'className=""'
  );

  // tr even/odd
  content = content.replace(
    /style=\{index % 2 === 0 \? styles\.trEven : styles\.trOdd\}/g,
    'className={index % 2 === 0 ? "" : "pd-report-row-even"}'
  );

  content = content.replace(/\n\/\/ ─── Styles ───[\s\S]*?const styles = \{[\s\S]*?\};\n\n/g, '\n');

  return content;
}

function fixPrintTemplates(content, filePath) {
  if (!filePath.includes('InvoiceTemplate') && !filePath.includes('PaymentVoucherPrintable')) {
    return content;
  }

  content = content.replace(/className="pd-print-table-cell p-2 mb-4"/g, 'className="pd-print-client-box"');
  content = content.replace(/className="min-w-full border-collapse pd-print-table-cell"/g, 'className="pd-print-table min-w-full"');
  content = content.replace(/className="w-full border-collapse pd-print-table-cell/g, 'className="pd-print-table w-full');
  content = content.replace(/className="pd-print-table-cell p-1/g, 'className="p-1');
  content = content.replace(/className="pd-print-table-cell p-2/g, 'className="p-2');
  content = content.replace(/border pd-print-border-light p-1/g, 'p-1');
  content = content.replace(/className="pd-print-table-cell p-2 h-8"/g, 'className="p-2 h-8"');
  content = content.replace(/text-sm text-gray-600/g, 'text-sm pd-text-muted');
  content = content.replace(
    /style=\{\{\s*maxWidth:\s*'800px',\s*margin:\s*'0 auto'\s*\}\}/g,
    ''
  );
  content = content.replace(
    'className="pd-print-document p-6 font-sans"',
    'className="pd-print-document pd-print-document--narrow p-6 font-sans"'
  );
  content = content.replace(
    /className="font-semibold border-t pd-print-border-strong pt-1 w-32"/g,
    'className="pd-print-signature-line"'
  );
  content = content.replace(
    /className="text-center border-t pd-print-border-strong pt-4"/g,
    'className="pd-print-footer"'
  );
  content = content.replace(/border-b-2 pd-print-border-strong/g, 'pd-print-total-line');

  return content;
}

function collectFiles() {
  const files = [];
  const reportsDir = path.join(SRC, 'Pages', 'Reports');
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('Popup.jsx')) files.push(full);
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

let changed = 0;
for (const f of collectFiles()) {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  c = fixLedgerPopups(c);
  c = fixLogReport(c);
  c = fixPrintTemplates(c, f);
  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8');
    changed++;
    console.log('✓', path.relative(SRC, f));
  }
}
console.log(`\nFixed ${changed} files`);