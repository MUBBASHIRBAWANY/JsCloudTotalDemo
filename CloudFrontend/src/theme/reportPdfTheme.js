/** Brand-aligned jsPDF / autoTable colors (RGB tuples) */
export const PDF_COLORS = {
  primary: [0, 49, 128],
  primaryLight: [0, 70, 175],
  headerText: [255, 255, 255],
  bodyText: [26, 28, 30],
  altRow: [249, 249, 252],
  border: [226, 232, 240],
  footer: [238, 238, 240],
  debit: [186, 26, 26],
  credit: [0, 88, 80],
};

/** Default autoTable theme for Pearl Dynamic (pvt) ltdreports */
export const pdfAutoTableDefaults = {
  headStyles: {
    fillColor: PDF_COLORS.primary,
    textColor: PDF_COLORS.headerText,
    fontStyle: 'bold',
    halign: 'left',
  },
  alternateRowStyles: {
    fillColor: PDF_COLORS.altRow,
  },
  styles: {
    fontSize: 9,
    cellPadding: 4,
    textColor: PDF_COLORS.bodyText,
    lineColor: PDF_COLORS.border,
    lineWidth: 0.1,
  },
  footStyles: {
    fillColor: PDF_COLORS.footer,
    fontStyle: 'bold',
  },
};

/** Merge caller options with branded defaults */
export function themedAutoTable(doc, options) {
  const { headStyles, alternateRowStyles, styles, footStyles, ...rest } = options;
  return {
    doc,
    options: {
      ...pdfAutoTableDefaults,
      ...rest,
      headStyles: { ...pdfAutoTableDefaults.headStyles, ...headStyles },
      alternateRowStyles: { ...pdfAutoTableDefaults.alternateRowStyles, ...alternateRowStyles },
      styles: { ...pdfAutoTableDefaults.styles, ...styles },
      footStyles: { ...pdfAutoTableDefaults.footStyles, ...footStyles },
    },
  };
}

/** Replace common legacy fillColor arrays in source strings */
export function patchPdfFillColors(source) {
  const legacyHeader = /\[\s*52\s*,\s*73\s*,\s*94\s*\]/g;
  const legacyHeader2 = /\[\s*44\s*,\s*62\s*,\s*80\s*\]/g;
  const legacyHeader3 = /\[\s*52\s*,\s*152\s*,\s*219\s*\]/g;
  const brand = `[${PDF_COLORS.primary.join(', ')}]`;
  return source
    .replace(legacyHeader, brand)
    .replace(legacyHeader2, brand)
    .replace(legacyHeader3, brand)
    .replace(/fillColor:\s*'#2c3e50'/g, `fillColor: ${brand}`)
    .replace(/fillColor:\s*'#34495e'/g, `fillColor: ${brand}`);
}