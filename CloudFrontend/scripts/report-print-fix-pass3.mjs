#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

function removeStylesObject(content) {
  const marker = 'const styles = {';
  let idx = content.indexOf(marker);
  while (idx !== -1) {
    let depth = 0;
    let end = idx + marker.length - 1; // points at opening {
    for (let i = end; i < content.length; i++) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    // include trailing semicolon and whitespace
    let tail = end + 1;
    if (content[tail] === ';') tail++;
    while (content[tail] === '\n' || content[tail] === '\r') tail++;
    content = content.slice(0, idx) + content.slice(tail);
    idx = content.indexOf(marker);
  }
  return content;
}

function fixLogButtons(content) {
  if (!content.includes('LogReportPopup')) return content;

  content = content.replace(
    /disabled=\{filteredLogs\.length === 0\}\s*style=\{\{\s*\.\.\.styles\.button,\s*\.\.\.styles\.excelButton,\s*\.\.\.\(filteredLogs\.length === 0 \? styles\.buttonDisabled : \{\}\),\s*\}\}/g,
    'disabled={filteredLogs.length === 0} className="pd-log-report__btn pd-log-report__btn--excel"'
  );
  content = content.replace(
    /disabled=\{filteredLogs\.length === 0\}\s*style=\{\{\s*\.\.\.styles\.button,\s*\.\.\.styles\.pdfButton,\s*\.\.\.\(filteredLogs\.length === 0 \? styles\.buttonDisabled : \{\}\),\s*\}\}/g,
    'disabled={filteredLogs.length === 0} className="pd-log-report__btn pd-log-report__btn--pdf"'
  );
  content = content.replace(
    /disabled=\{filteredLogs\.length === 0\}\s*style=\{\{\s*\.\.\.styles\.button,\s*\.\.\.styles\.printButton,\s*\.\.\.\(filteredLogs\.length === 0 \? styles\.buttonDisabled : \{\}\),\s*\}\}/g,
    'disabled={filteredLogs.length === 0} className="pd-log-report__btn pd-log-report__btn--print"'
  );

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
  return files;
}

let changed = 0;
for (const f of collectFiles()) {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  c = fixLogButtons(c);
  c = removeStylesObject(c);
  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8');
    changed++;
    console.log('✓', path.relative(SRC, f));
  }
}
console.log(`\nCleaned ${changed} files`);