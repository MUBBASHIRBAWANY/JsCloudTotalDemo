import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const COMPANY = "Pearl Dynamic (pvt) ltd";
const PRIMARY = "FF185FA5";
const HEADER_BG = "FF185FA5";
const HEADER_FG = "FFFFFFFF";
const ALT_ROW = "FFF8FAFC";
const BORDER = "FFE5E7EB";
const TOTAL_BG = "FFE6F1FB";
const MUTED = "FF6B7280";

const ID_KEY_RE = /^(_id|id|__v|objectid)$/i;
const SERIAL_KEY_RE = /^(#|sr\.?\s*no\.?|s\.?\s*no\.?|sno|serial(\s*no)?)$/i;
const TOTAL_RE = /^(total|grand total|totals|net total)$/i;

const isIdKey = (key) => ID_KEY_RE.test(String(key).trim());
const isSerialKey = (key) => SERIAL_KEY_RE.test(String(key).trim());

const looksLikeMongoId = (value) => {
  if (value == null || value === "") return false;
  if (typeof value === "object") return Boolean(value._id || value.$oid);
  return /^[a-f0-9]{24}$/i.test(String(value));
};

const cellText = (value) => {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    return value.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  if (typeof value === "object") {
    return (
      value.label ||
      value.Name ||
      value.name ||
      value.StoreName ||
      value.CutomerName ||
      value.AccountName ||
      value.ProductName ||
      value.VendorName ||
      ""
    );
  }
  return value;
};

const DECIMAL_STR = /^-?\d+\.\d+$/;

const isNumericColumn = (rows, key) => {
  let sawNumber = false;
  for (const row of rows) {
    const value = row?.[key];
    if (value == null || value === "") continue;
    if (typeof value === "boolean") return false;
    if (typeof value === "number" && Number.isFinite(value)) {
      sawNumber = true;
      continue;
    }
    // Decimal strings only (e.g. toFixed). Integer strings stay text so codes
    // like 000123 / invoice numbers keep leading zeros.
    if (typeof value === "string" && DECIMAL_STR.test(value.trim())) {
      sawNumber = true;
      continue;
    }
    return false;
  }
  return sawNumber;
};

const isTotalRow = (row, keys) => {
  if (!row) return false;
  return keys.some((key) => {
    const value = row[key];
    return typeof value === "string" && TOTAL_RE.test(value.trim());
  });
};

const thinBorder = {
  top: { style: "thin", color: { argb: BORDER } },
  left: { style: "thin", color: { argb: BORDER } },
  bottom: { style: "thin", color: { argb: BORDER } },
  right: { style: "thin", color: { argb: BORDER } },
};

const applyHeaderBlock = (worksheet, { company, title, meta, colCount }) => {
  const generatedOn = new Date().toLocaleString("en-GB");
  const lines = [
    company,
    title,
    `Generated: ${generatedOn}${meta?.length ? `    |    ${meta.filter(Boolean).join("    |    ")}` : ""}`,
  ];

  lines.forEach((text, index) => {
    const row = worksheet.addRow([text]);
    worksheet.mergeCells(row.number, 1, row.number, Math.max(colCount, 1));
    const cell = row.getCell(1);
    if (index === 0) {
      cell.font = { bold: true, size: 16, color: { argb: PRIMARY } };
      row.height = 26;
    } else if (index === 1) {
      cell.font = { bold: true, size: 13, color: { argb: "FF111827" } };
      row.height = 20;
    } else {
      cell.font = { size: 10, color: { argb: MUTED } };
    }
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  worksheet.addRow([]);
  return worksheet.lastRow.number + 1;
};

const addProfessionalSheet = (workbook, options) => {
  const {
    company = COMPANY,
    title = "Report",
    sheetName,
    rows = [],
    columns,
    meta = [],
    excludeKeys = [],
    totals,
  } = options;

  const sample = rows[0] || totals || {};
  const excluded = new Set(
    [...excludeKeys, ...Object.keys(sample).filter(isIdKey)].map((k) => String(k))
  );

  const inferredKeys = columns?.length
    ? columns.map((col) => col.key)
    : Object.keys(sample).filter((key) => !excluded.has(String(key)) && !isIdKey(key));

  const keys = inferredKeys.filter((key) => !isIdKey(key) && !excluded.has(String(key)));
  if (!keys.length) {
    keys.push("Message");
  }

  const headers = columns?.length
    ? columns.map((col) => col.header || col.key)
    : keys.map((key) => key);

  const numeric = {};
  keys.forEach((key, index) => {
    if (columns?.[index]?.type === "number") numeric[key] = true;
    else if (columns?.[index]?.type === "text") numeric[key] = false;
    else if (isSerialKey(key)) numeric[key] = false;
    else numeric[key] = isNumericColumn(rows, key);
  });

  const wsName = (sheetName || title || "Report").slice(0, 31);
  const worksheet = workbook.addWorksheet(wsName);

  const headerRowNumber = applyHeaderBlock(worksheet, {
    company,
    title,
    meta: [
      rows.length ? `Records: ${rows.length}` : "",
      ...(Array.isArray(meta) ? meta : [meta]),
    ].filter(Boolean),
    colCount: Math.max(headers.length, 1),
  });

  worksheet.views = [{ state: "frozen", ySplit: headerRowNumber }];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FG }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder;
  });

  const pushRow = (source, index, { total = false } = {}) => {
    const values = keys.map((key) => {
      if (isSerialKey(key)) return total ? "" : index + 1;
      const raw = source?.[key];
      if (looksLikeMongoId(raw) && (isIdKey(key) || isSerialKey(key))) {
        return total ? "" : index + 1;
      }
      if (numeric[key]) {
        if (raw == null || raw === "") return null;
        const num = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(num) ? num : cellText(raw);
      }
      return cellText(raw);
    });

    const dataRow = worksheet.addRow(values);
    dataRow.eachCell((cell, colNumber) => {
      const key = keys[colNumber - 1];
      cell.font = { size: 10, bold: total };
      cell.alignment = {
        vertical: "middle",
        horizontal: numeric[key] || isSerialKey(key) ? "right" : "left",
        wrapText: true,
      };
      cell.border = thinBorder;
      if (numeric[key] && typeof cell.value === "number") {
        cell.numFmt = "#,##0.00";
      }
      if (isSerialKey(key)) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.numFmt = "0";
      }
      if (total) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
      } else if (index % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW } };
      }
    });
  };

  rows.forEach((row, index) => {
    pushRow(row, index, { total: isTotalRow(row, keys) });
  });

  if (totals && typeof totals === "object") {
    const totalRow = { ...totals };
    const labelKey = keys.find((key) => !numeric[key] && !isSerialKey(key));
    if (labelKey && (totalRow[labelKey] == null || totalRow[labelKey] === "")) {
      totalRow[labelKey] = "TOTAL";
    }
    pushRow(totalRow, rows.length, { total: true });
  }

  worksheet.columns = keys.map((key, index) => {
    if (columns?.[index]?.width) return { width: columns[index].width };
    const headerLen = String(headers[index] || key).length;
    const maxLen = Math.max(
      headerLen,
      ...rows.slice(0, 200).map((row) => String(cellText(row?.[key]) || "").length)
    );
    return { width: Math.min(Math.max(maxLen + 2, 10), 42) };
  });

  if (rows.length) {
    worksheet.autoFilter = {
      from: { row: headerRow.number, column: 1 },
      to: { row: headerRow.number + rows.length, column: headers.length },
    };
  }

  worksheet.pageSetup = {
    orientation: headers.length > 8 ? "landscape" : "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };
  worksheet.headerFooter.oddFooter = `&L${company}&CPage &P of &N&RConfidential`;

  return worksheet;
};

const sanitizeFileName = (name) =>
  String(name || "Report")
    .replace(/\.xlsx$/i, "")
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "Report";

/**
 * Professional Excel download for reports.
 * Strips Mongo ids, styles headers, freezes panes, auto-filters, and formats numbers.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.fileName]
 * @param {string} [options.sheetName]
 * @param {Array<object>} [options.rows]
 * @param {Array<{header:string,key:string,width?:number,type?:string}>} [options.columns]
 * @param {string[]} [options.meta]
 * @param {string[]} [options.excludeKeys]
 * @param {object} [options.totals]
 * @param {Array<object>} [options.sheets] multi-sheet: [{ name, rows, columns, meta, totals, title }]
 */
export async function exportProfessionalExcel(options = {}) {
  const {
    title = "Report",
    fileName,
    company = COMPANY,
    sheets,
    rows = [],
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = company;
  workbook.created = new Date();

  const sheetList = Array.isArray(sheets) && sheets.length
    ? sheets
    : [{ ...options, name: options.sheetName || title, rows }];

  sheetList.forEach((sheet) => {
    addProfessionalSheet(workbook, {
      company,
      title: sheet.title || title,
      sheetName: sheet.name || sheet.sheetName || title,
      rows: sheet.rows || [],
      columns: sheet.columns || options.columns,
      meta: sheet.meta || options.meta,
      excludeKeys: sheet.excludeKeys || options.excludeKeys,
      totals: sheet.totals,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `${sanitizeFileName(fileName || title)}_${stamp}.xlsx`);
}

export default exportProfessionalExcel;
