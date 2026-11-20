import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, TextRun } from "docx";

const SalesInvoiceView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const Client = useSelector((state) => state.Client.client);
  const Products = useSelector((state) => state.Product.product);
  const SalesInvoice = useSelector((state) => state.SalesInvoice.SalesInvoice);

  const companyInfo = {
    name: "",
    address: "Site",
    city: "Karachi",

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

  const client = Client.find((c) => c._id === invoice.Client);
  const totalAmount = invoice.SalesData.reduce((sum, item) => sum + (parseFloat(item.Amount) || 0), 0);
  const totalDiscount = invoice.SalesData.reduce((sum, item) => sum + (parseFloat(item.Discount) || 0), 0);
  const totalGST = invoice.SalesData.reduce((sum, item) => sum + (parseFloat(item.Gst) || 0), 0);
  const totalNetAmount = invoice.SalesData.reduce((sum, item) => sum + (parseFloat(item.netAmunt) || 0), 0);

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
    doc.text(`Invoice Number: ${invoice.SalesInvoice}`, 40, 140);
    doc.text(`Date: ${invoice.SalesInvoiceDate}`, 40, 155);
    doc.text(`Customer: ${client?.CutomerName || "N/A"}`, 40, 170);

    // Prepare table data
    const tableColumn = ["Product", "CTN", "Rate", "Amount", "Discount", "GST", "Net Amount"];
    const tableRows = [];

    // Process data to avoid duplicates and format correctly
    const productMap = new Map();

    invoice.SalesData.forEach(row => {
      const productName = Products.find(p => p._id === row.product)?.ProductName || "N/A";
      const key = `${productName}-${row.rate}`;

      if (productMap.has(key)) {
        // Update existing entry
        const existing = productMap.get(key);
        existing.ctn = (parseInt(existing.ctn) || 0) + (parseInt(row.Delivered) || 0);
        existing.amount = (parseFloat(existing.amount) || 0) + (parseFloat(row.Amount) || 0);
        existing.discount = (parseFloat(existing.discount) || 0) + (parseFloat(row.Discount) || 0);
        existing.gst = (parseFloat(existing.gst) || 0) + (parseFloat(row.Gst) || 0);
        existing.netAmount = (parseFloat(existing.netAmount) || 0) + (parseFloat(row.netAmunt) || 0);
      } else {
        // Add new entry
        productMap.set(key, {
          product: productName,
          ctn: row.Delivered || 0,
          rate: parseFloat(row.rate) || 0,
          amount: parseFloat(row.Amount) || 0,
          discount: parseFloat(row.Discount) || 0,
          gst: parseFloat(row.Gst) || 0,
          netAmount: parseFloat(row.netAmunt) || 0
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
        value.gst.toFixed(2),
        value.netAmount.toFixed(2)
      ]);
    });

    // Add totals row
    tableRows.push([
      "TOTAL",
      invoice.SalesData.reduce((sum, item) => sum + (parseInt(item.Delivered) || 0), 0).toString(),
      "-",
      totalAmount.toFixed(2),
      totalDiscount.toFixed(2),
      totalGST.toFixed(2),
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
    doc.text(`Add Amount: ${Number(invoice?.AddAmount).toLocaleString() || "N/A"}`, 40, 300);
    doc.text(`Less Amount: ${Number(invoice?.LessAmount).toLocaleString() || "N/A"}`, 40, 310);
    doc.text(`Total Amount: ${Number(invoice?.TotalAmount).toLocaleString() || "N/A"}`, 40, 320);
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
      [`Invoice Number: ${invoice.SalesInvoice}`],
      [`Date: ${invoice.SalesInvoiceDate}`],
      [`Client: ${client?.CutomerName || "N/A"}`],
      [],
      ["Product", "CTN", "Rate", "Amount", "Discount", "GST", "Net Amount"]
    ];

    // Add invoice items
    invoice.SalesData.forEach(row => {
      excelData.push([
        Products.find((p) => p._id === row.product)?.ProductName,
        row.Delivered,
        row.rate,
        row.Amount,
        row.Discount || 0,
        row.Gst || 0,
        row.netAmunt
      ]);
    });

    // Add totals row
    excelData.push([
      "TOTAL",
      invoice.SalesData.reduce((sum, item) => sum + (parseInt(item.Delivered) || 0), 0),
      "-",
      totalAmount,
      totalDiscount,
      totalGST,
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
    const tableRows = invoice.SalesData.map(row => {
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(Products.find((p) => p._id === row.product)?.ProductName || "")] }),
          new TableCell({ children: [new Paragraph(String(row.Delivered))] }),
          new TableCell({ children: [new Paragraph(String(row.rate))] }),
          new TableCell({ children: [new Paragraph(String(row.Amount))] }),
          new TableCell({ children: [new Paragraph(String(row.Discount || 0))] }),
          new TableCell({ children: [new Paragraph(String(row.Gst || 0))] }),
          new TableCell({ children: [new Paragraph(String(row.netAmunt))] })
        ]
      });
    });

    // Add totals row
    tableRows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("TOTAL")], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(invoice.SalesData.reduce((sum, item) => sum + (parseInt(item.Delivered) || 0), 0).toString())], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph("-")], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(totalAmount.toFixed(2))], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(totalDiscount.toFixed(2))], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(totalGST.toFixed(2))], shading: { fill: "DDEBF7" } }),
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
              children: [new TextRun({ text: `Invoice Number: ${invoice.SalesInvoice}`, bold: true })],
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: `Date: ${invoice.SalesInvoiceDate}`,
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: `Client: ${client?.CutomerName || 'N/A'}`,
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
                    new TableCell({ children: [new Paragraph("GST")], shading: { fill: "DDEBF7" } }),
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


  const handlePrint = () => {
    const printContent = document.getElementById("invoiceView").innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
    <html>
      <head>
        <title>Invoice</title>
        <style>
          @media print {
            @page {
               size: A4 portrait; /* Half page in portrait mode */
    margin: 1mm;
    margin-right: 1mm;
            }
            body {
              -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    margin-left: 30px;
    margin-right: 30px;
            }
            .print-footer {
              position: fixed;
              bottom: 50%;
              left: 0;
              right: 0;
            }
            .watermark {
              position: fixed;
              top: 40%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.05;
              width: 400px;
            }
          }

          body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.5;
          }
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            
          }
          .print-header img {
            height: 50px;
          }
          .invoice-title {
            text-align: center;
            font-size: 20px;
            margin: 20px 0;
            font-weight: bold;
            letter-spacing: 1px;
          }
          .invoice-details {
            margin-bottom: 20px;
            font-size: 10px;
          }
          .invoice-details p {
            margin: 3px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 10px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 6px 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .total-row {
            font-weight: bold;
            background-color: #f0f0f0;
          }
          .summary {
            margin-top: 20px;
            font-size: 10px;
            border-top: 2px solid #333;
            padding-top: 10px;
            width: 200px
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
          }
          .summary-row span:first-child {
            color: #555;
          }
          .summary-row .negative {
            color: red;
          }
          .summary-row .positive {
            color: green;
            font-weight: bold;
          }
          .print-footer {
            font-size: 8px;
            text-align: center;
            color: #555;
            border-top: 1px solid #ccc;
            padding: 8px 0;
            background: white;
          }
          .Products_Detail {
          font-size: 8px;
          }
        </style>
      </head>
      <body>
        <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755944631/Screenshot_2025-08-23_152337_ajpexh.png" class="watermark" />
        
        <div class="print-header">
          <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755944631/Screenshot_2025-08-23_152337_ajpexh.png" />
          
        </div>
        
        <div class="invoice-title">SALES INVOICE</div>
        
        <div class="invoice-details">
          <p><strong>Invoice Number:</strong> ${invoice.SalesInvoice}</p>
          <p><strong>Date:</strong> ${invoice.SalesInvoiceDate}</p>
          <p><strong>Client:</strong> ${client?.CutomerName || 'N/A'}</p>
        </div>
        <div class="Products_Detail"> 
        ${printContent}
        </div>
        <div class="summary">
          <h3>Invoice Summary</h3>
          <div class="summary-row">
            <span>Total Amount:</span>
            <span>${Number(totalAmount).toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Add Amount:</span>
            <span>${Number(invoice.AddAmount).toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Total Discount:</span>
            <span class="negative">-${totalDiscount.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Less Amount:</span>
            <span class="negative">-${Number(invoice.LessAmount).toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Net Amount:</span>
            <span class="positive">${Number(invoice.TotalAmount).toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Remarks:</span>
            <span >${invoice.Remarks}</span>
          </div>
        </div>

        <div class="print-footer">
          Developed by Jaffer Sons | Website: 
          <a href="https://jaffersons.com/" target="_blank">jaffersons.com</a> | 
          
        </div>
      </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
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
                    <div>Invoice Number: <span className="font-semibold">{invoice.SalesInvoice}</span></div>
                    <div className="mt-1">Date: {invoice.SalesInvoiceDate}</div>
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
                  <p className="font-medium text-gray-800">{client?.CutomerName || 'N/A'}</p>
                  <p className="text-gray-600">{client?.Address || 'Address not available'}</p>
                  <p className="text-gray-600">{client?.Phone || 'Phone not available'}</p>
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
                    <span className="font-medium">{invoice.SalesData.length}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium">{totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Add Amount:</span>
                    <span className="font-medium">{Number(invoice.AddAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Total Discount:</span>
                    <span className="font-medium text-red-600">-{totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Less Amount:</span>
                    <span className="font-medium text-red-600">-{Number(invoice.LessAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Amount:</span>
                    <span className="font-medium text-green-600">{Number(invoice.TotalAmount).toFixed(2)}</span>
                  </div>
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">CTN</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Rate</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Discount</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">GST</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Net Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.SalesData.map((row, i) => {
                  const product = Products.find((p) => p._id === row.product);
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product?.ProductName || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{product?.ProductCode || 'No code'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {row.Delivered || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {row.rate || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {Number(row.Amount || 0 ).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-red-600">
                        {Number(row.Discount || 0 ).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {Number(row.Gst || 0 ).toLocaleString() }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-green-600">
                        {Number(row.netAmunt || 0).toLocaleString() }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">Total</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">
                    {invoice.SalesData.reduce((sum, item) => sum + (parseInt(item.Delivered) || 0), 0)}
                  </td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">-</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">{(totalAmount.toLocaleString())}</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-red-600">-{totalDiscount.toLocaleString()}</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">{totalGST.toLocaleString()}</td>
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

export default SalesInvoiceView;