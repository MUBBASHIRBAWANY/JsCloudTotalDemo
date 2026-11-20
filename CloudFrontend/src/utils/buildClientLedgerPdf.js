import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const NAVY = [0, 49, 128];
const NAVY_DARK = [0, 24, 72];
const INK = [26, 28, 30];
const MUTED = [67, 70, 83];
const LINE = [214, 218, 226];
const BAND = [243, 246, 251];
const ALT = [248, 250, 252];
const OPENING_BG = [232, 240, 252];
const TOTAL_BG = [226, 234, 246];
const WHITE = [255, 255, 255];
const SOFT_WHITE = [190, 205, 235];

const MARGIN = 10;
const HEADER_BOTTOM = 28;
const CARD_TOP = 32;
const CARD_HEIGHT = 14;

const isOpeningRow = (row) =>
  String(row?.Narration || "").toUpperCase().includes("OPENING BAL");

const money = (amount, blankZero = false) => {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "";
  if (blankZero && Math.abs(num) < 0.005) return "";
  const formatted = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return num < -0.004 ? `(${formatted})` : formatted;
};

const tableAmount = (amount, blankZero = false) => {
  const formatted = money(amount, blankZero);
  if (!formatted) return "";
  // Courier is monospace. A trailing space keeps decimals lined up with bracketed credits.
  return formatted.endsWith(")") ? formatted : `${formatted} `;
};

const withSide = (amount) => {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "-";
  const formatted = money(num) || "0.00";
  if (num < -0.004) return `${formatted} Cr`;
  if (num > 0.004) return `${formatted} Dr`;
  return formatted;
};

const ellipsize = (doc, text, maxWidth, fontSize, style) => {
  const value = String(text || "");
  doc.setFont("helvetica", style);
  doc.setFontSize(fontSize);
  if (doc.getTextWidth(value) <= maxWidth) return value;
  let end = value.length;
  while (end > 1 && doc.getTextWidth(`${value.slice(0, end)}...`) > maxWidth) {
    end -= 1;
  }
  return `${value.slice(0, Math.max(end, 1))}...`;
};

const paintHeader = (doc, meta) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightWidth = 74;
  const leftWidth = pageWidth - MARGIN * 2 - rightWidth - 6;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 12, "F");

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Pearl Dynamic (Pvt) Ltd", MARGIN, 7.8);

  doc.setFontSize(11);
  const documentTitle = ellipsize(
    doc,
    meta.documentTitle || "CLIENT LEDGER",
    90,
    11,
    "bold"
  );
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(documentTitle, pageWidth - MARGIN, 7.8, { align: "right" });

  doc.setFillColor(...BAND);
  doc.rect(0, 12, pageWidth, 16, "F");
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.45);
  doc.line(0, HEADER_BOTTOM, pageWidth, HEADER_BOTTOM);

  const account = ellipsize(
    doc,
    meta.accountName || "Client Ledger",
    leftWidth,
    11,
    "bold"
  );
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(account, MARGIN, 18.6);

  const detailParts = [
    ...(meta.detailParts && meta.detailParts.length
      ? meta.detailParts
      : [meta.accountCode ? `Code ${meta.accountCode}` : "", meta.periodLabel]),
    "Amounts in PKR",
    meta.filtered ? "Filtered copy" : "",
  ].filter(Boolean);
  const detail = ellipsize(doc, detailParts.join("   |   "), leftWidth, 8, "normal");
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(detail, MARGIN, 24.2);

  const printed = ellipsize(
    doc,
    meta.printedBy ? `Printed by  ${meta.printedBy}` : "Printed by  System",
    rightWidth,
    8,
    "normal"
  );
  const generated = ellipsize(doc, meta.generatedLabel, rightWidth, 8, "normal");
  doc.text(printed, pageWidth - MARGIN, 18.6, { align: "right" });
  doc.text(generated, pageWidth - MARGIN, 24.2, { align: "right" });
};

const paintSummary = (doc, cards) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const gap = 2.5;
  const cardWidth = (pageWidth - MARGIN * 2 - gap * (cards.length - 1)) / cards.length;

  cards.forEach((card, index) => {
    const x = MARGIN + index * (cardWidth + gap);
    doc.setFillColor(...(card.emphasis ? NAVY : WHITE));
    doc.setDrawColor(...(card.emphasis ? NAVY : LINE));
    doc.setLineWidth(0.3);
    doc.roundedRect(x, CARD_TOP, cardWidth, CARD_HEIGHT, 1.2, 1.2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...(card.emphasis ? SOFT_WHITE : MUTED));
    doc.text(card.label, x + 3, CARD_TOP + 4.6);

    let size = 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    const maxWidth = cardWidth - 6;
    while (size > 7 && doc.getTextWidth(card.value) > maxWidth) {
      size -= 0.4;
      doc.setFontSize(size);
    }
    doc.setTextColor(...(card.emphasis ? WHITE : NAVY_DARK));
    doc.text(card.value, x + cardWidth - 3, CARD_TOP + 10.6, { align: "right" });
  });

  return CARD_TOP + CARD_HEIGHT;
};

const paintSignatures = (doc, y, printedBy) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const columnWidth = (pageWidth - MARGIN * 2) / 3;
  const roles = [
    { label: "Prepared By", name: printedBy || "" },
    { label: "Reviewed By", name: "" },
    { label: "Approved By", name: "" },
  ];

  roles.forEach((role, index) => {
    const x = MARGIN + index * columnWidth;
    const lineWidth = Math.min(58, columnWidth - 14);
    if (role.name) {
      const name = ellipsize(doc, role.name, lineWidth, 8, "bold");
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(name, x, y + 4);
    }
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.35);
    doc.line(x, y + 6.2, x + lineWidth, y + 6.2);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(role.label, x, y + 10.6);
  });
};

const paintFooter = (doc, pageNumber, pageCount, accountName) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, pageHeight - 9, pageWidth - MARGIN, pageHeight - 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Pearl Dynamic (Pvt) Ltd", MARGIN, pageHeight - 5);
  const center = ellipsize(doc, accountName || "Client Ledger", 120, 7.5, "normal");
  doc.text(center, pageWidth / 2, pageHeight - 5, { align: "center" });
  doc.text(`Page ${pageNumber} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 5, {
    align: "right",
  });
};

const CLIENT_COLUMNS = [
  { header: "VOUCH DATE", field: "date", width: 24, align: "center" },
  { header: "VOUCHER NO.", field: "voucherNo", width: 30, align: "center" },
  { header: "CHO / BILL NO.", field: "refNo", width: 28, align: "center" },
  { header: "CHO / BILL DT.", field: "refDate", width: 24, align: "center" },
  { header: "ACCOUNT NAME / DESCRIPTION", field: "Narration", flex: true, align: "left", role: "description" },
  { header: "DEBIT", field: "rawDebit", width: 27, align: "right", kind: "money" },
  { header: "CREDIT", field: "rawCredit", width: 27, align: "right", kind: "money" },
  { header: "BALANCE", field: "rawBalance", width: 32, align: "right", kind: "balance" },
];

const BOOKER_COLUMNS = [
  { header: "VOUCH DATE", field: "date", width: 26, align: "center" },
  { header: "VOUCHER NO.", field: "voucherNo", width: 34, align: "center" },
  { header: "REF NO.", field: "refNo", width: 30, align: "center" },
  { header: "ACCOUNT NAME / DESCRIPTION", field: "Narration", flex: true, align: "left", role: "description" },
  { header: "DEBIT", field: "rawDebit", width: 28, align: "right", kind: "money" },
  { header: "CREDIT", field: "rawCredit", width: 28, align: "right", kind: "money" },
  { header: "BALANCE", field: "rawBalance", width: 32, align: "right", kind: "balance" },
];

const isAmountColumn = (column) => column?.kind === "money" || column?.kind === "balance";

const cellValue = (row, column, opening) => {
  if (column.kind === "money") return opening ? "" : tableAmount(row[column.field], true);
  if (column.kind === "balance") return tableAmount(row[column.field]) || "0.00 ";
  return row[column.field] || "";
};

const renderStatement = (doc, statement, shared) => {
  const { columns, documentTitle, generatedLabel, pageAccounts } = shared;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const rows = statement.rows || [];
  const headerMeta = {
    documentTitle,
    accountName: statement.accountName,
    accountCode: statement.accountCode,
    periodLabel: statement.periodLabel,
    detailParts: statement.detailParts,
    printedBy: statement.printedBy,
    filtered: statement.filtered,
    generatedLabel,
  };

  const movementRows = rows.filter((row) => !isOpeningRow(row));
  const openingRow = rows.find(isOpeningRow);
  const openingBalance = openingRow ? Number(openingRow.rawBalance) || 0 : 0;
  const totalDebit = movementRows.reduce((sum, row) => sum + (Number(row.rawDebit) || 0), 0);
  const totalCredit = movementRows.reduce((sum, row) => sum + (Number(row.rawCredit) || 0), 0);
  const lastRow = rows[rows.length - 1];
  const closingBalance =
    lastRow && Number.isFinite(Number(lastRow.rawBalance))
      ? Number(lastRow.rawBalance)
      : openingBalance + totalDebit - totalCredit;

  const summaryBottom = paintSummary(doc, [
    {
      label: "OPENING BALANCE",
      value: openingRow ? withSide(openingBalance) : "-",
    },
    { label: "TOTAL DEBIT", value: money(totalDebit) || "0.00" },
    { label: "TOTAL CREDIT", value: money(totalCredit) || "0.00" },
    {
      label: statement.filtered ? "LAST BALANCE" : "CLOSING BALANCE",
      value: withSide(closingBalance),
      emphasis: true,
    },
  ]);

  const body = [];
  const kinds = [];
  const descriptionIndex = Math.max(0, columns.findIndex((column) => column.role === "description"));

  if (rows.length === 0) {
    const note = columns.map(() => "");
    note[descriptionIndex] = "No ledger entries for this period.";
    body.push(note);
    kinds.push("note");
  }

  rows.forEach((row) => {
    const opening = isOpeningRow(row);
    kinds.push(opening ? "opening" : "line");
    body.push(columns.map((column) => cellValue(row, column, opening)));
  });

  const totalRow = columns.map(() => "");
  const closingRow = columns.map(() => "");
  totalRow[descriptionIndex] = "TOTAL";
  closingRow[descriptionIndex] = "CLOSING BALANCE";
  columns.forEach((column, index) => {
    if (column.field === "rawDebit") totalRow[index] = tableAmount(totalDebit) || "0.00 ";
    if (column.field === "rawCredit") totalRow[index] = tableAmount(totalCredit) || "0.00 ";
    if (column.kind === "balance") closingRow[index] = tableAmount(closingBalance) || "0.00 ";
  });
  body.push(totalRow, closingRow);
  kinds.push("total", "closing");

  const usable = pageWidth - MARGIN * 2;
  const fixedWidth = columns.reduce((sum, column) => sum + (column.flex ? 0 : column.width), 0);
  const flexWidth = Math.max(40, usable - fixedWidth);
  const amountIndexes = new Set(
    columns.map((column, index) => (isAmountColumn(column) ? index : -1)).filter((index) => index >= 0)
  );

  autoTable(doc, {
    startY: summaryBottom + 4,
    margin: { top: HEADER_BOTTOM + 4, right: MARGIN, bottom: 16, left: MARGIN },
    tableWidth: usable,
    showHead: "everyPage",
    theme: "grid",
    head: [columns.map((column) => column.header)],
    body,
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      textColor: INK,
      lineColor: LINE,
      lineWidth: 0.15,
      cellPadding: { top: 1.5, right: 1.4, bottom: 1.5, left: 1.4 },
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      valign: "middle",
      lineColor: NAVY,
      lineWidth: 0.15,
    },
    columnStyles: Object.fromEntries(
      columns.map((column, index) => [
        index,
        {
          cellWidth: column.flex ? flexWidth : column.width,
          halign: column.align,
          font: isAmountColumn(column) ? "courier" : "helvetica",
        },
      ])
    ),
    alternateRowStyles: { fillColor: ALT },
    didParseCell: (hook) => {
      if (hook.section === "head") {
        if (hook.column.index === descriptionIndex) hook.cell.styles.halign = "left";
        if (amountIndexes.has(hook.column.index)) hook.cell.styles.halign = "right";
        return;
      }
      if (hook.section !== "body") return;

      const kind = kinds[hook.row.index];
      if (kind === "opening") {
        hook.cell.styles.fillColor = OPENING_BG;
        hook.cell.styles.textColor = NAVY;
        hook.cell.styles.fontStyle = "italic";
      } else if (kind === "total") {
        hook.cell.styles.fillColor = TOTAL_BG;
        hook.cell.styles.textColor = NAVY_DARK;
        hook.cell.styles.fontStyle = "bold";
      } else if (kind === "closing") {
        hook.cell.styles.fillColor = NAVY;
        hook.cell.styles.textColor = WHITE;
        hook.cell.styles.fontStyle = "bold";
        hook.cell.styles.lineColor = NAVY;
      } else if (kind === "note") {
        hook.cell.styles.textColor = MUTED;
        hook.cell.styles.fontStyle = "italic";
      }

      if (amountIndexes.has(hook.column.index)) {
        hook.cell.styles.font = "courier";
        hook.cell.styles.fontStyle = "normal";
      }
    },
    willDrawPage: () => {
      const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
      pageAccounts[pageNumber] = statement.accountName || "";
      paintHeader(doc, headerMeta);
    },
  });

  const footerLimit = pageHeight - 14;
  let signatureY = (doc.lastAutoTable?.finalY || summaryBottom) + 8;
  if (signatureY + 14 > footerLimit) {
    doc.addPage();
    const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
    pageAccounts[pageNumber] = statement.accountName || "";
    paintHeader(doc, headerMeta);
    signatureY = HEADER_BOTTOM + 10;
  }
  paintSignatures(doc, signatureY, statement.printedBy);
};

const buildLedgerStatementsPdf = ({
  documentTitle,
  subject,
  statements,
  generatedAt = new Date(),
  columns,
}) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const generatedLabel = generatedAt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const pageAccounts = {};
  const firstName = statements[0]?.accountName || subject;

  doc.setProperties({
    title: `${firstName} - ${subject}`,
    subject,
    creator: "Pearl Dynamic (Pvt) Ltd",
  });

  statements.forEach((statement, index) => {
    if (index > 0) doc.addPage();
    renderStatement(doc, statement, {
      columns,
      documentTitle,
      generatedLabel,
      pageAccounts,
    });
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    paintFooter(doc, page, pageCount, pageAccounts[page] || firstName);
  }

  return doc;
};

export function buildClientLedgerPdf({
  rows = [],
  accountName = "",
  accountCode = "",
  periodLabel = "",
  printedBy = "",
  filtered = false,
  generatedAt = new Date(),
} = {}) {
  return buildLedgerStatementsPdf({
    documentTitle: "CLIENT LEDGER",
    subject: "Client Ledger",
    generatedAt,
    columns: CLIENT_COLUMNS,
    statements: [
      {
        rows,
        accountName,
        accountCode,
        periodLabel,
        printedBy,
        filtered,
      },
    ],
  });
}

const cleanClientName = (name) =>
  String(name || "").replace(/^Client\s*:\s*/i, "").trim();

export function buildBookerWiseLedgerPdf({
  bookerName = "",
  periodLabel = "",
  openingDateLabel = "",
  printedBy = "",
  clients = [],
  generatedAt = new Date(),
} = {}) {
  const statements = clients.map((client, index) => {
    const name = cleanClientName(client.name) || "Client";
    const openingBalance = Number(client.openingBalance) || 0;
    const rows = [
      {
        date: openingDateLabel,
        voucherNo: "",
        refNo: "",
        refDate: "",
        Narration: `OPENING BAL. AS ON : ${openingDateLabel}`,
        rawDebit: 0,
        rawCredit: 0,
        rawBalance: openingBalance,
      },
      ...(client.transactions || []).map((transaction) => ({
        date: transaction.date || "",
        voucherNo: transaction.voucherNo || "",
        refNo: transaction.refNo || "",
        refDate: "",
        Narration: transaction.narration || "",
        rawDebit: Number(transaction.debit) || 0,
        rawCredit: Number(transaction.credit) || 0,
        rawBalance: Number(transaction.balance) || 0,
      })),
    ];

    return {
      accountName: name,
      periodLabel,
      printedBy,
      rows,
      detailParts: [
        bookerName ? `Booker ${bookerName}` : "",
        client.city ? `City ${client.city}` : "",
        `Client ${index + 1} of ${clients.length}`,
        periodLabel,
      ].filter(Boolean),
    };
  });

  return buildLedgerStatementsPdf({
    documentTitle: "BOOKER WISE LEDGER",
    subject: "Booker Wise Ledger",
    generatedAt,
    columns: BOOKER_COLUMNS,
    statements,
  });
}

export default buildClientLedgerPdf;
