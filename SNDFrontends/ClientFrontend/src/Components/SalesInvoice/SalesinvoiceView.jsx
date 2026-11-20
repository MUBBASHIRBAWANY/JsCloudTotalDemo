import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, TextRun } from "docx";

const SalesinvoiceView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const Client = useSelector((state) => state.Client.client);
  const Products = useSelector((state) => state.Product.product);
  const SalesInvoice = useSelector((state) => state.SalesInvoice.DisSalesInvoice);

  const companyInfo = {
    name: "",
    address: "",
    city: "",

    email: "",
    website: ""
  };

  useEffect(() => {
    const fetchedInvoice = SalesInvoice.find((inv) => inv._id === id);
    setInvoice(fetchedInvoice);
    setIsLoading(false);
  }, [id, SalesInvoice]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600 mb-6">
            The invoice you requested could not be found. It may have been deleted or archived.
          </p>
          <button
            onClick={() => navigate("/SalesInvoice")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  // Robust client lookup (supports id or pre-resolved name/string in different invoice types)
  const foundClient = Client.find((c) => c._id === invoice.Client);
  const client = foundClient || (invoice.Client && typeof invoice.Client === 'string' ? { CutomerName: invoice.Client } : null);

  // Fallback-aware getters to support both DC-based invoices (Delivered/Amount/Discount/...) 
  // and LoadForm/DSR-settled invoices (orderBox/DeliveredBox, GrossAmount, To, NetSale, RTGRate, ...)
  const getDelivered = (row) => parseInt(row?.Delivered ?? row?.DeliveredBox ?? row?.orderBox ?? 0) || 0;
  const getRate = (row) => parseFloat(row?.Amount ?? row?.GrossAmount ?? 0)  /  row?.DeliveredBox  || 0; 
  const getAmount = (row) => parseFloat(row?.Amount ?? row?.GrossAmount ?? 0) || 0;
  const getDiscount = (row) => parseFloat(row?.Discount ?? row?.To ?? 0) || 0;
  const SpecialTO = (row) => parseFloat(row?.SpecialTO ?? 0) || 0;
  const getNet = (row) => parseFloat(row?.netAmunt ?? row?.NetSale ?? row?.netAmount ?? 0) || 0;

  const getBoxInCarton = (product) => parseInt(product?.BoxinCarton) || 1;

  const visibleSalesData = invoice.SalesData.filter((row) => getDelivered(row) > 0);

  const getCtnBox = (row) => {
    const product = Products.find((p) => p._id === row.product);
    const delivered = getDelivered(row);
    const boxInCarton = getBoxInCarton(product);
    return {
      ctn: Math.floor(delivered / boxInCarton),
      box: delivered % boxInCarton,
      totalBox: delivered,
    };
  };

  const totalAmount = visibleSalesData.reduce((sum, item) => sum + getAmount(item), 0);
  const totalDiscount = visibleSalesData.reduce((sum, item) => sum + getDiscount(item), 0);
  const totalscheme = visibleSalesData.reduce((sum, item) => sum + SpecialTO(item), 0);
  const totalNetAmount = visibleSalesData.reduce((sum, item) => sum + getNet(item), 0);
  const quantityTotals = visibleSalesData.reduce(
    (acc, row) => {
      const { ctn, box, totalBox } = getCtnBox(row);
      acc.ctn += ctn;
      acc.box += box;
      acc.totalBox += totalBox;
      return acc;
    },
    { ctn: 0, box: 0, totalBox: 0 }
  );

  // PDF Export
  const exportPDF = () => {
    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    // Company header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(companyInfo.name, pageWidth / 2, 40, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(companyInfo.address, pageWidth / 2, 60, { align: "center" });
    doc.text(companyInfo.city, pageWidth / 2, 75, { align: "center" });
    doc.text(`${companyInfo.phone} | ${companyInfo.email} | ${companyInfo.website}`, pageWidth / 2, 90, { align: "center" });

    // Invoice title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SALES INVOICE", pageWidth / 2, 120, { align: "center" });

    // Invoice details
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice Number: ${invoice.DisSalesInvoice}`, 40, 140);
    doc.text(`Date: ${invoice.SalesInvoiceDate}`, 40, 155);
    doc.text(`Customer: ${client?.CutomerName || client?.CustomorName || invoice.Client || "N/A"}`, 40, 170);

    // Prepare table data
    const tableColumn = ["Product", "CTN", "Rate", "Amount", "Discount", "Net Amount"];
    const tableRows = [];

    // Process data to avoid duplicates and format correctly
    const productMap = new Map();

    visibleSalesData.forEach(row => {
      const productName = Products.find(p => p._id === row.product)?.ProductName || "N/A";
      const rateKey = getRate(row);
      const key = `${productName}-${rateKey}`;

      if (productMap.has(key)) {
        // Update existing entry
        const existing = productMap.get(key);
        existing.ctn = (parseInt(existing.ctn) || 0) + getDelivered(row);
        existing.amount = (parseFloat(existing.amount) || 0) + getAmount(row);
        existing.discount = (parseFloat(existing.discount) || 0) + getDiscount(row);
        existing.netAmount = (parseFloat(existing.netAmount) || 0) + getNet(row);
      } else {
        // Add new entry
        productMap.set(key, {
          product: productName,
          ctn: getDelivered(row),
          rate: rateKey,
          amount: getAmount(row),
          discount: getDiscount(row),
          netAmount: getNet(row)
        });
      }
    });

    // Convert map to array for the table
    productMap.forEach(value => {
      tableRows.push([
        value.product,
        value.ctn.toString(),
        value.rate.toFixed(2),
        value.amount.toFixed(2),
        value.discount.toFixed(2),
        value.netAmount.toFixed(2)
      ]);
    });

    // Add totals row
    tableRows.push([
      "TOTAL",
      visibleSalesData.reduce((sum, item) => sum + getDelivered(item), 0).toString(),
      "-",
      totalAmount.toFixed(2),
      totalDiscount.toFixed(2),
      totalNetAmount.toFixed(2)
    ]);

    // Generate the table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 190,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
      didDrawPage: function (data) {
        // Footer on each page
        doc.setFontSize(9);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 40, doc.internal.pageSize.height - 30);
        doc.text("Developed by JS International | / | ",
          pageWidth / 2, doc.internal.pageSize.height - 30, { align: "center" });
      }
    });
    doc.text(`Add Amount: ${Number(invoice?.AddAmount || 0).toLocaleString() || "N/A"}`, 40, 300);
    doc.text(`Less Amount: ${Number(invoice?.LessAmount || 0).toLocaleString() || "N/A"}`, 40, 310);
    doc.text(`Total Amount: ${Number(invoice?.TotalAmount || invoice?.Totalamount || totalNetAmount || 0).toLocaleString() || "N/A"}`, 40, 320);
    doc.text(`Remarks: ${invoice?.Remarks || "N/A"}`, 40, 330);
    doc.save("SalesInvoice.pdf");
  };


  // Excel Export
  const handleExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Prepare data with header
    const excelData = [
      [companyInfo.name],
      [companyInfo.address],
      [companyInfo.city],
      [`${companyInfo.phone} | ${companyInfo.email} | ${companyInfo.website}`],
      [],
      ["SALES INVOICE"],
      [],
      [`Invoice Number: ${invoice.DisSalesInvoice}`],
      [`Date: ${invoice.SalesInvoiceDate}`],
      [`Client: ${client?.CutomerName || client?.CustomorName || invoice.Client || "N/A"}`],
      [],
      ["Product", "CTN", "Rate", "Amount", "Discount", "Net Amount"]
    ];

    // Add invoice items
    visibleSalesData.forEach(row => {
      excelData.push([
        Products.find((p) => p._id === row.product)?.ProductName,
        getDelivered(row),
        getRate(row),
        getAmount(row),
        getDiscount(row),
        getNet(row)
      ]);
    });

    // Add totals row
    excelData.push([
      "TOTAL",
      visibleSalesData.reduce((sum, item) => sum + getDelivered(item), 0),
      "-",
      totalAmount,
      totalDiscount,
      totalNetAmount
    ]);

    // Add footer
    excelData.push([]);
    excelData.push([`Generated on: ${new Date().toLocaleDateString()}`]);
    excelData.push(["Developed by JS International | / | "]);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Invoice");

    // Generate Excel file
    XLSX.writeFile(wb, "SalesInvoice.xlsx");
  };


  // Word Export
  const handleWord = async () => {
    // Prepare table rows
    const tableRows = visibleSalesData.map(row => {
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(Products.find((p) => p._id === row.product)?.ProductName || "")] }),
          new TableCell({ children: [new Paragraph(String(getDelivered(row)))] }),
          new TableCell({ children: [new Paragraph(String(getRate(row)))] }),
          new TableCell({ children: [new Paragraph(String(getAmount(row)))] }),
          new TableCell({ children: [new Paragraph(String(getDiscount(row)))] }),
          new TableCell({ children: [new Paragraph(String(getNet(row)))] })
        ]
      });
    });

    // Add totals row
    tableRows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("TOTAL")], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(visibleSalesData.reduce((sum, item) => sum + getDelivered(item), 0).toString())], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph("-")], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(totalAmount.toFixed(2))], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(totalDiscount.toFixed(2))], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(totalNetAmount.toFixed(2))], shading: { fill: "DDEBF7" } })
      ]
    }));

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Company header
            new Paragraph({
              children: [new TextRun({ text: companyInfo.name, bold: true, size: 28 })],
              alignment: 'center'
            }),
            new Paragraph({
              children: [new TextRun({ text: companyInfo.address, size: 22 })],
              alignment: 'center'
            }),
            new Paragraph({
              children: [new TextRun({ text: companyInfo.city, size: 22 })],
              alignment: 'center'
            }),
            new Paragraph({
              children: [new TextRun({ text: `${companyInfo.phone} | ${companyInfo.email} | ${companyInfo.website}`, size: 22 })],
              alignment: 'center',
              spacing: { after: 400 }
            }),

            // Invoice title
            new Paragraph({
              text: "SALES INVOICE",
              heading: HeadingLevel.HEADING_1,
              alignment: 'center',
              spacing: { after: 400 }
            }),

            // Invoice details
            new Paragraph({
              children: [new TextRun({ text: `Invoice Number: ${invoice.DisSalesInvoice}`, bold: true })],
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: `Date: ${invoice.SalesInvoiceDate}`,
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: `Client: ${client?.CutomerName || client?.CustomorName || invoice.Client || 'N/A'}`,
              spacing: { after: 400 }
            }),

            // Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Product")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("CTN")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("Rate")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("Amount")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("Discount")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("Net Amount")], shading: { fill: "DDEBF7" } })
                  ]
                }),
                ...tableRows
              ]
            }),

            // Footer
            new Paragraph({
              text: `Generated on: ${new Date().toLocaleDateString()}`,
              spacing: { before: 600 }
            }),
            new Paragraph({
              text: "Developed by JS International | / | "
            })
          ]
        }
      ]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SalesInvoice.docx";
    a.click();
    URL.revokeObjectURL(url);
  };


  const clientName = client?.CutomerName || client?.CustomorName || invoice.Client || "N/A";
  const orderBookerName = invoice.OrderBooker
    ? (typeof invoice.OrderBooker === "string" ? invoice.OrderBooker : (invoice.OrderBooker?.label || "N/A"))
    : "";
  const netTotal = Number(invoice.TotalAmount || invoice.Totalamount || totalNetAmount || 0);

  const buildPrintTableRows = () => {
    return visibleSalesData.map((row) => {
      const product = Products.find((p) => p._id === row.product);
      const { ctn, box, totalBox } = getCtnBox(row);
      return `
        <tr>
          <td class="center">${product?.mastercode || "N/A"}</td>
          <td>${product?.ProductName || "N/A"}</td>
          <td class="num">${ctn}</td>
          <td class="num">${box}</td>
          <td class="num">${totalBox}</td>
          <td class="num">${getRate(row)}</td>
          <td class="num">${Number(getAmount(row)).toLocaleString()}</td>
          <td class="num">${Number(getDiscount(row)).toLocaleString()}</td>
          <td class="num">${Number(SpecialTO(row)).toLocaleString()}</td>
          <td class="num">${Number(getNet(row)).toLocaleString()}</td>
        </tr>
      `;
    }).join("");
  };

  const handlePrint = () => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "Sales Invoice Print");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Invoice ${invoice.DisSalesInvoice}</title>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 5mm; }
              body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              thead { display: table-header-group; }
              tr { page-break-inside: avoid; }
              table { page-break-inside: auto; }
              .invoice-section {
                border: none;
                page-break-inside: auto;
                break-inside: auto;
              }
              .bottom-section {
                page-break-inside: avoid;
              }
              .total-row {
                page-break-inside: avoid;
              }
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #1f2937;
              font-size: 11px;
              padding: 4px;
            }
            .invoice-section {
              border: 1px solid #9ca3af;
              padding: 2.5mm 3.5mm;
              box-sizing: border-box;
              max-width: 100%;
            }
            .header {
              border-bottom: 2px solid #1e40af;
              padding-bottom: 5px;
              margin-bottom: 6px;
              text-align: center;
            }
            .header h1 { margin: 0 0 3px; font-size: 18px; color: #1e3a8a; }
            .header p { margin: 1px 0; font-size: 11px; color: #4b5563; }
            .meta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px;
              margin-bottom: 6px;
              font-size: 10px;
            }
            .meta-box {
              border: 1px solid #d1d5db;
              border-radius: 3px;
              padding: 4px 6px;
            }
            .meta-box h3 {
              margin: 0 0 4px;
              font-size: 11px;
              color: #1e40af;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 2px;
            }
            .meta-box p { margin: 2px 0; }
            .section-title {
              font-size: 12px;
              font-weight: bold;
              background: #1e40af;
              color: #fff;
              padding: 3px 7px;
              margin: 5px 0 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
              margin-bottom: 5px;
              table-layout: fixed;
            }
            th, td {
              padding: 2px 3px;
              word-wrap: break-word;
              overflow-wrap: break-word;
              line-height: 1.2;
            }
            thead th {
              border: 1px solid #9ca3af;
              background: #e5e7eb;
              font-weight: 600;
              text-align: left;
            }
            td.num, th.num { text-align: right; }
            td.center, th.center { text-align: center; }
            .total-row td {
              border: 1px solid #9ca3af;
              font-weight: bold;
              background: #f3f4f6;
            }
            .bottom-section {
              display: grid;
              grid-template-columns: 1fr 160px;
              gap: 10px;
              margin-top: 10px;
            }
            .summary-box {
              border: 1px solid #d1d5db;
              padding: 4px 5px;
              font-size: 10px;
            }
            .summary-box h3 {
              margin: 0 0 4px;
              font-size: 11px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 2px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .summary-row .negative { color: #dc2626; }
            .summary-row .positive { color: #16a34a; font-weight: bold; }
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 5px;
            }
            .sig-box {
              border: 1px solid #d1d5db;
              padding: 6px;
              min-height: 60px;
              font-size: 11px;
            }
            .sig-box h4 { margin: 0 0 20px; font-size: 13px; }
            .sig-line { border-top: 1px solid #9ca3af; margin-top: 4px; padding-top: 2px; }
            .print-footer {
              margin-top: 5px;
              padding-top: 4px;
              border-top: 1px solid #d1d5db;
              font-size: 8px;
              text-align: center;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="invoice-section">
            <div class="header">
              <h1>${companyInfo.name}</h1>
              <p>${companyInfo.address} | ${companyInfo.city}</p>
              <p><strong>SALES INVOICE</strong></p>
            </div>

            <div class="meta">
              <div class="meta-box">
                <h3>Client Information</h3>
                <p><strong>Client:</strong> ${clientName}</p>
                <p><strong>Address:</strong> ${client?.Address || "N/A"}</p>
                <p><strong>Phone:</strong> ${client?.Phone || "N/A"}</p>
                ${invoice.Remarks ? `<p><strong>Remarks:</strong> ${invoice.Remarks}</p>` : ""}
              </div>
               <div class="meta-box">
                <h3>Invoice Details</h3>
                <p><strong>Invoice Number:</strong> ${invoice.DisSalesInvoice}</p>
                <p><strong>Date:</strong> ${invoice.SalesInvoiceDate}</p>
                ${invoice.LoadFormNumber ? `<p><strong>Load Form:</strong> ${invoice.LoadFormNumber}</p>` : ""}
                ${orderBookerName ? `<p><strong>Order Booker:</strong> ${orderBookerName}</p>` : ""}
              </div>
            </div>

            <div class="section-title">PRODUCTS DETAILS</div>
            <table>
              <thead>
                <tr>
                  <th class="center" style="width:8%">Code</th>
                  <th class="center" style="width:18%">Product</th>
                  <th class="center" style="width:6%">CTN</th>
                  <th class="center" style="width:6%">BOX</th>
                  <th class="center" style="width:7%">Total Box</th>
                  <th class="center" style="width:8%">TP Rate</th>
                  <th class="center" style="width:11%">Gross Amount</th>
                  <th class="center" style="width:10%">Discount</th>
                  <th class="center" style="width:10%">Scheme</th>
                  <th class="center" style="width:14%">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                ${buildPrintTableRows() || '<tr><td colspan="9" class="center">No items</td></tr>'}
                <tr class="total-row">
                  <td colspan="2">TOTAL</td>
                  <td class="num">${quantityTotals.ctn}</td>
                  <td class="num">${quantityTotals.box}</td>
                  <td class="num">${quantityTotals.totalBox}</td>
                  <td class="num">-</td>
                  <td class="num">${totalAmount.toLocaleString()}</td>
                  <td class="num">${totalDiscount.toLocaleString()}</td>
                  <td class="num">${totalscheme.toLocaleString()}</td>
                  <td class="num">${totalNetAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div class="bottom-section">
              <div class="signatures">
                <div class="sig-box">
                  <h4>Prepared By</h4>
                  <div class="sig-line">Signature / Date: ${new Date().toLocaleDateString()}</div>
                </div>
                <div class="sig-box">
                  <h4>Verified By</h4>
                  <div class="sig-line">Signature / Date: ___________</div>
                </div>
                <div class="sig-box">
                  <h4>Received By</h4>
                  <div class="sig-line">Signature / Date: ___________</div>
                </div>
              </div>
              <div class="summary-box">
                <h3>Invoice Summary</h3>
                <div class="summary-row"><span>Gross Amount:</span><span>${totalAmount.toLocaleString()}</span></div>
                <div class="summary-row"><span>Discount:</span><span >${totalDiscount.toLocaleString()}</span></div>
                <div class="summary-row"><span>Scheme:</span><span >${totalscheme.toLocaleString()}</span></div>
                <div class="summary-row"><span>Slab Discount(${invoice?.SlabPercentage ||0}%):</span><span>${((invoice.SlabDiscount || 0)).toLocaleString()}</span></div>
            <div class="summary-row"><span>Net Amount:</span><span class="positive">${netTotal}</span></div>
              </div>
            </div>

            <div class="print-footer">
              Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} |
              | / | 
            </div>
          </div>
        </body>
      </html>
    `;

    const printDoc = iframe.contentWindow.document;
    printDoc.open();
    printDoc.write(printContent);
    printDoc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  };




  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Document Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200">
          <div className="bg-gradient-to-r from-blue-800 to-indigo-900 px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-6 md:mb-0 text-center md:text-left">
                <h1 className="text-3xl font-bold text-white">{companyInfo.name}</h1>
                <p className="text-blue-200 mt-2">{companyInfo.address}</p>
                <p className="text-blue-200">{companyInfo.city}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-md">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-800">SALES INVOICE</h2>
                  <div className="mt-3 text-gray-600">
                    <div>Invoice Number: <span className="font-semibold">{invoice.DisSalesInvoice}</span></div>
                    <div className="mt-1">Date: {invoice.SalesInvoiceDate}</div>
                    {invoice.LoadFormNumber && <div className="mt-1 text-xs">Load Form: {invoice.LoadFormNumber}</div>}
                    {invoice.OrderNumber && <div className="mt-1 text-xs">Order #: {invoice.OrderNumber}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between">
              <div className="mb-6 md:mb-0">
                <h3 className="text-lg font-semibold text-gray-700">Client Information</h3>
                <div className="mt-2 bg-blue-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-800">{client?.CutomerName || client?.CustomorName || invoice.Client || 'N/A'}</p>
                  <p className="text-gray-600">{client?.Address || 'Address not available'}</p>
                  <p className="text-gray-600">{client?.Phone || 'Phone not available'}</p>
                  {invoice.OrderBooker && (
                    <p className="text-xs text-gray-500 mt-1">Order Booker: {typeof invoice.OrderBooker === 'string' ? invoice.OrderBooker : (invoice.OrderBooker?.label || invoice.OrderBooker)}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end">
                <div className="flex space-x-3 mb-4">
                  <button
                    onClick={() => navigate("/SalesInvoice")}
                    className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors shadow-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to List
                  </button>
                  <button
                    onClick={exportPDF}
                    className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    Export PDF
                  </button>
                  <button
                    onClick={handleExcel}
                    className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    Export Excel
                  </button>
                  <button
                    onClick={handleWord}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    Export Word
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                    </svg>
                    Print
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 w-full max-w-xs">
                  <h4 className="font-semibold text-gray-700 mb-2">Invoice Summary</h4>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Total Items:</span>
                    <span className="font-medium">{visibleSalesData.length}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium">{totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Add Amount:</span>
                    <span className="font-medium">{Number(invoice.AddAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Total Discount:</span>
                    <span className="font-medium text-red-600">-{totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Less Amount:</span>
                    <span className="font-medium text-red-600">-{Number(invoice.LessAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Amount:</span>
                    <span className="font-medium text-green-600">{Number(invoice.TotalAmount || invoice.Totalamount || totalNetAmount || 0).toFixed(2)}</span>
                  </div>
                  {(invoice.Recived != null || invoice.Remaining != null) && (
                    <>
                      <div className="flex justify-between mt-1 pt-1 border-t">
                        <span className="text-gray-600">Received:</span>
                        <span className="font-medium">{Number(invoice.Recived || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Remaining:</span>
                        <span className="font-medium">{Number(invoice.Remaining || 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div id="invoiceView" className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800">Products Details</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product Code</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">CTN</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">BOX</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Total Box</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Rate</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Discount</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Scheme</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Net Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleSalesData.map((row, i) => {
                  const product = Products.find((p) => p._id === row.product);
                  const { ctn, box, totalBox } = getCtnBox(row);
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {product?.mastercode || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product?.ProductName || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{product?.mastercode || 'No code'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {ctn}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {box}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {totalBox}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {getRate(row)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {Number(getAmount(row)).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-red-600">
                        {Number(getDiscount(row)).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-blue-600">
                        {Number(SpecialTO(row)).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-green-600">
                        {Number(getNet(row)).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-6 py-3 text-sm font-bold text-gray-900">Total</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">{quantityTotals.ctn}</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">{quantityTotals.box}</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">{quantityTotals.totalBox}</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">-</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">{totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-red-600">-{totalDiscount.toLocaleString()}</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-blue-600">{totalscheme.toLocaleString()}</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-green-600">{totalNetAmount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Authorization Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Prepared By</h4>
            <div className="mt-8 pt-2 border-t border-gray-300">
              <p className="text-sm text-gray-500">Signature:</p>
              <div className="mt-6 h-0.5 bg-gray-200 w-full"></div>
              <p className="mt-2 text-sm text-gray-500">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Verified By</h4>
            <div className="mt-8 pt-2 border-t border-gray-300">
              <p className="text-sm text-gray-500">Signature:</p>
              <div className="mt-6 h-0.5 bg-gray-200 w-full"></div>
              <p className="mt-2 text-sm text-gray-500">Date: ___________</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Received By</h4>
            <div className="mt-8 pt-2 border-t border-gray-300">
              <p className="text-sm text-gray-500">Signature:</p>
              <div className="mt-6 h-0.5 bg-gray-200 w-full"></div>
              <p className="mt-2 text-sm text-gray-500">Date: ___________</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 position fixed text-center text-sm text-gray-500">
          <p>{companyInfo.name} | {companyInfo.address} | {companyInfo.city}</p>
          <p className="mt-1">{companyInfo.phone} | {companyInfo.email} | {companyInfo.website}</p>
          <p className="mt-2">Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          <p className="mt-1">Developed by JS International | / | </p>
        </div>
      </div>
    </div>
  );
};

export default SalesinvoiceView;