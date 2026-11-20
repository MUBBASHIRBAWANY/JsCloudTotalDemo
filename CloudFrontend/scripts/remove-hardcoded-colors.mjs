import fs from "fs";
import path from "path";

const srcRoot = path.join(process.cwd(), "src");
const skipPatterns = [/PdfDocument\.jsx$/i, /InvoiceTemplate\.jsx$/i, /Printable\.jsx$/i];

const replacements = [
  ["text-lg font-semibold text-gray-800", "pd-section-title"],
  ["text-xl font-semibold text-gray-800", "pd-page-title"],
  ["block text-sm font-semibold text-gray-700 mb-1", "pd-label"],
  ["block text-sm font-semibold text-gray-700", "pd-label"],
  ["block text-sm font-semibold text-gray-600 mb-1", "pd-label"],
  ["block text-sm font-semibold text-gray-600", "pd-label"],
  ["text-sm font-semibold text-gray-600 mb-1", "pd-label"],
  ["text-sm font-semibold text-gray-600", "pd-label"],
  ["border-transparent text-gray-500 hover:text-gray-700", "pd-tab-inactive"],
  ["w-full px-3 py-2 text-sm md:text-base border rounded-lg bg-gray-100", "pd-input-readonly text-sm md:text-base"],
  ["w-full px-3 py-2 text-sm md:text-base border rounded-lg bg-gray-50", "pd-input-readonly text-sm md:text-base"],
  ["w-px h-6 bg-gray-200", "w-px h-6 pd-divider"],
  ["tr className=\"bg-gray-100 font-semibold\"", "tr className=\"pd-table-footer\""],
  ["<tr className=\"bg-gray-100 font-semibold\">", "<tr className=\"pd-table-footer\">"],
  ["px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700", "pd-btn-warning"],
  ["px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700", "pd-btn-success px-4 py-2"],
  ["px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600", "pd-btn-outline"],
  ["bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700", "pd-btn-outline"],
  ["w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg", "pd-btn-save w-full"],
  ["text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5", "pd-btn-save"],
  ["px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700", "pd-btn-save"],
  ["bg-blue-700 text-white", "pd-btn-save"],
  ["text-gray-900 dark:text-white", "pd-text-body"],
  ["text-gray-800 dark:text-white", "pd-text-body"],
  ["text-gray-700 dark:text-gray-300", "pd-text-body"],
  ["text-gray-600 dark:text-gray-400", "pd-text-muted"],
  ["text-gray-500 dark:text-gray-400", "pd-text-muted"],
  ["text-gray-900", "pd-text-body"],
  ["text-gray-800", "pd-text-body"],
  ["text-gray-700", "pd-text-body"],
  ["text-gray-600", "pd-text-muted"],
  ["text-gray-500", "pd-text-muted"],
  ["text-gray-400", "pd-text-muted"],
  ["text-blue-500", "pd-text-primary"],
  ["text-blue-600", "pd-text-primary"],
  ["text-blue-700", "pd-text-primary"],
  ["bg-gray-50 dark:bg-gray-900", "pd-bg-muted"],
  ["bg-gray-50 dark:bg-gray-800", "pd-bg-muted"],
  ["bg-white dark:bg-gray-800", "pd-bg-surface"],
  ["bg-white dark:bg-gray-900", "pd-bg-surface"],
  ["bg-gray-50", "pd-bg-muted"],
  ["bg-gray-100", "pd-bg-muted"],
  ["bg-gray-200", "pd-bg-readonly"],
  ["bg-white ", "pd-bg-surface "],
  ["border-gray-300 dark:border-gray-600", "pd-border-default border"],
  ["border-gray-200 dark:border-gray-700", "pd-border-default border"],
  ["border-gray-300", "pd-border-default border"],
  ["border-gray-200", "pd-border-default border"],
  ["border-t border-gray-300 dark:border-gray-700", "border-t pd-border-default border"],
  ["border-t border-gray-300", "border-t pd-border-default border"],
  ["hover:bg-gray-50 dark:hover:bg-gray-700", ""],
  ["hover:bg-gray-100", ""],
  ["hover:bg-gray-50", ""],
  ["#003180", "var(--pd-primary)"],
  ["#001B3D", "var(--pd-sidebar)"],
  ["#ffffff", "var(--pd-surface-container-lowest)"],
  ["#FFFFFF", "var(--pd-surface-container-lowest)"],
  ["#f9fafb", "var(--pd-surface-container-low)"],
  ["#f3f4f6", "var(--pd-surface-container-low)"],
  ["#f3f3f6", "var(--pd-surface-container-low)"],
  ["#e5e7eb", "var(--pd-border-card)"],
  ["#e2e8f0", "var(--pd-border-card)"],
  ["#d1d5db", "var(--pd-outline-variant)"],
  ["#9ca3af", "var(--pd-on-surface-variant)"],
  ["#6b7280", "var(--pd-on-surface-variant)"],
  ["#4b5563", "var(--pd-on-surface-variant)"],
  ["#374151", "var(--pd-on-surface)"],
  ["#1f2937", "var(--pd-on-surface)"],
  ["#111827", "var(--pd-on-surface)"],
  ["#1a1c1e", "var(--pd-on-surface)"],
  ["#fe6b00", "var(--pd-warning)"],
  ["#00d8fe", "var(--pd-secondary)"],
];

function shouldSkip(file) {
  return skipPatterns.some((re) => re.test(file));
}

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (e.name.endsWith(".jsx") || e.name.endsWith(".tsx")) files.push(p);
  }
  return files;
}

function cleanDarkVariants(content) {
  return content
    .replace(/\s+dark:bg-[^\s"']+/g, "")
    .replace(/\s+dark:text-[^\s"']+/g, "")
    .replace(/\s+dark:border-[^\s"']+/g, "")
    .replace(/\s+dark:hover:[^\s"']+/g, "")
    .replace(/\s+dark:focus:[^\s"']+/g, "");
}

let updated = 0;
for (const file of walk(srcRoot)) {
  if (shouldSkip(file)) continue;
  let content = fs.readFileSync(file, "utf8");
  const original = content;
  for (const [from, to] of replacements) content = content.split(from).join(to);
  content = cleanDarkVariants(content);
  content = content.replace(/className="([^"]*)"/g, (m, cls) => {
    const cleaned = cls.replace(/\s{2,}/g, " ").trim();
    return cleaned ? `className="${cleaned}"` : "";
  });
  if (content !== original) {
    fs.writeFileSync(file, content, "utf8");
    updated++;
  }
}
console.log("Hardcoded color cleanup: " + updated + " files updated");
