import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const globalDir = path.join(projectRoot, 'src', 'Components', 'Global');
const scanRoots = [
  path.join(projectRoot, 'src', 'Components', 'Accounts'),
  path.join(projectRoot, 'src', 'Pages', 'Reports'),
  path.join(projectRoot, 'src', 'Components', 'Ai'),
];
const replacements = [
  ['text-3xl font-bold text-center  text-gray-800 mb-6', 'pd-page-title text-center mb-6'],
  ['text-2xl font-bold text-gray-800 text-center mb-6', 'pd-page-title text-center mb-6'],
  ['text-2xl font-bold text-gray-800 mb-6', 'pd-page-title mb-6'],
  ['text-2xl font-bold text-gray-800', 'pd-page-title'],
  ['text-xl font-semibold text-gray-800', 'pd-page-title'],
  ['block text-sm font-medium text-gray-700 mb-2', 'pd-label'],
  ['block text-sm font-medium text-gray-700 mb-1', 'pd-label'],
  ['block text-sm font-medium text-gray-700', 'pd-label'],
  ['block text-sm font-semibold text-gray-700 mb-1', 'pd-label'],
  ['block text-sm font-semibold text-gray-700', 'pd-label'],
  ['block text-sm font-semibold text-gray-600', 'pd-label'],
  ['w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500', 'pd-input'],
  ['w-full h-[40px] px-3 border rounded-lg focus:ring-2 focus:ring-blue-500', 'pd-input'],
  ['bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md mx-[30%] my-[5%]', 'pd-card p-6 w-[90%] max-w-md mx-[30%] my-[5%]'],
  ['bg-white p-6 rounded-lg shadow-md', 'pd-card p-6'],
  ['bg-white p-4 md:p-6 rounded-lg shadow-md', 'pd-card p-4 md:p-6'],
  ['bg-white rounded-xl shadow-lg mb-6 p-6', 'pd-card mb-6 p-6'],
  ['min-h-screen bg-gray-50 p-6', 'pd-page min-h-screen'],
  ['w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition', 'pd-btn-save w-full'],
  ['bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700', 'pd-btn-save'],
  ['className="h-[70vh] w-full overflow-x-auto"', 'className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto"'],
  ['classNamePrefix="react-select"', 'classNamePrefix="pd-select"'],
  ['classNamePrefix="select"', 'classNamePrefix="pd-select"'],
];
function getGlobalImportPath(filePath) {
  let rel = path.relative(path.dirname(filePath), globalDir).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel + '/AppSelect.jsx';
}
function stripSelectBoilerplate(content) {
  return content.replace(/\s*menuPortalTarget=\{document\.body\}/g, '')
    .replace(/\s*styles=\{\{\s*menuPortal:\s*(?:base|provided)\s*=>\s*\(\{\s*\.\.\.(?:base|provided),\s*zIndex:\s*9999\s*\}\)\s*\}\}/g, '');
}
function migrateReactSelect(content, filePath) {
  const hasSelect = /import\s+Select\s+from\s+['"]react-select['"]/.test(content);
  const hasAsync = /import\s+AsyncSelect\s+from\s+['"]react-select\/async['"]/.test(content);
  if (!hasSelect && !hasAsync) return { content, migrated: false };
  const importPath = getGlobalImportPath(filePath);
  if (hasSelect) {
    content = content.replace(/import\s+Select\s+from\s+['"]react-select['"]\s*;?\s*\n?/, `import AppSelect from '${importPath}'\n`);
    content = content.replace(/<Select\b/g, '<AppSelect');
  }
  if (hasAsync) {
    const asyncPath = importPath.replace('AppSelect.jsx', 'AppAsyncSelect.jsx');
    content = content.replace(/import\s+AsyncSelect\s+from\s+['"]react-select\/async['"]\s*;?\s*\n?/, `import AppAsyncSelect from '${asyncPath}'\n`);
    content = content.replace(/<AsyncSelect\b/g, '<AppAsyncSelect');
  }
  content = stripSelectBoilerplate(content);
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
    content = content.slice(0, insertAt) + '</div>' + content.slice(insertAt);
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
let updated = 0, selectMigrated = 0;
for (const scanRoot of scanRoots) {
  for (const file of walkDir(scanRoot)) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    for (const [from, to] of replacements) content = content.split(from).join(to);
    const { content: next, migrated } = migrateReactSelect(content, file);
    content = fixListPageClosing(next);
    if (migrated) selectMigrated++;
    if (content !== original) { fs.writeFileSync(file, content, 'utf8'); updated++; }
  }
}
console.log('Wave 5: ' + updated + ' files, ' + selectMigrated + ' selects');
