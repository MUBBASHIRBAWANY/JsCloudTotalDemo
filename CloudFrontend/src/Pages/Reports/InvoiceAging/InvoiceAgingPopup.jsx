import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";

import { ConvetDate } from '../../../Components/Global/getDate';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';




const InvoiceAgingPopup = ({ filterData = [], title = "Invoice Aging" }) => {
  //console.log(filterData)
  // Report name used in headers/exports - avoids "Investment Report Report"
  const reportName = title.toLowerCase().endsWith('report') ? title : `${title} Report`;
  const [isLoading, setIsLoading] = useState(false);
  const { startDate, endDate } = filterData
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([])

  const getDaysDiff = (dateString) => {
    const givenDate = new Date(dateString);
    const today = new Date();
    const diffTime = today - givenDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };
  //console.log(filterData.Customer)
  const formatDate = (dateValue) => {
    if (dateValue == "") {
      return ""
    }
    let date;

    if (typeof dateValue === "number") {
      // 🧮 If it's an Excel serial number, convert it to JS date
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const daysInMs = dateValue * 24 * 60 * 60 * 1000;
      date = new Date(excelEpoch.getTime() + daysInMs);
    } else {
      // 📅 Otherwise, assume it's a normal date string
      date = new Date(dateValue);
    }

    // ✅ Format the date in "12-Nov-2025" style
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(",", "");
  };

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);

  // Sample product data mapping (would typically come from props or API)
  ;

const getData = async () => {
  setIsLoading(true);

  try {
    const allChqs = await getDataFundtion('/CustomerChqRecived/Allunused');
    const chqList = Array.isArray(allChqs) ? allChqs : allChqs?.data || [];
    const Chqs = chqList.filter(item => item.Invoice !== undefined && item.Invoice !== null && item.Invoice !== '');

    // One call. The API reads lowercase store as a comma-separated id list.
    const storeParam = (filterData.Store || [])
      .map((id) => String(id?._id || id))
      .filter(Boolean)
      .join(',');
    const res = await getDataFundtion(
      `/SaleInvoice/getOnlyInvoiceAging?startDate=${filterData.startDate}&endDate=${filterData.endDate}&store=${storeParam}`
    );
    const agingRows = Array.isArray(res) ? res : res?.data || [];

    const alldata = agingRows.map(item => {

      const customer =
        filterData.Customer.find(C => C.value === item.Client) ||
        filterData.Customer.find(C => C.value === item.Distrbutor);

      const invoice =
        item.SalesInvoice || item.Invoice || item.DitributorInvoiceCode;

      const invoiceChqs = Chqs.filter(
        chq => String(chq.Invoice) === String(invoice)
      );

      return {
        ...item,

        invoice,

        date: ConvetDate(
          item.SalesInvoiceDate || item.date || item.InvoiceDate
        ),

        SalesflowRef: item.SalesFlowRef || "",

        Client: item.Client || item.Distrbutor,

        ClientName: customer?.name || "",

        ClientCode: customer?.SalesFlowRef || "",

        OrderBooker:
          item.OrderBooker || customer?.OrderBooker || "0",

        chq: invoiceChqs
          .map(row => `(${row.chq})`)
          .join(", "),

        chqDate: invoiceChqs
          .map(row => `(${ConvetDate(row.RealizeDate)})`)
          .join(", "),

        ChqAmount: invoiceChqs.reduce(
          (sum, row) => sum + (Number(row.Amount) || 0),
          0
        ),

        SeprateChqAmount: invoiceChqs
          .map(row => `(${Number(Number(row.Amount || 0).toFixed(2))})`)
          .join(", ")
      };
    });

    setData(alldata);

  } catch (err) {
    console.error('Error fetching data:', err);
  } finally {
    setIsLoading(false);
  }
};


  useEffect(() => {
    getData()
  }, [])

  // Process data on component mount or when filterData changes
  useEffect(() => {
    if (data && data.length > 0) {
      const sortedData = data
        .sort((a, b) => {
          const statusA = a.PostStatus === true ? 1 : 0;
          const statusB = b.PostStatus === true ? 1 : 0;
          if (statusA !== statusB) return statusB - statusA; // Posted first
          return Number(a.invoice) - Number(b.invoice);
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const filteredProducts = sortedData.filter(item =>
        filterData.Customer.some(c => String(c.value) === String(item.Client || item.Distrbutor)) &&
        (!item.Store || (filterData.Store || []).some((id) => String(id) === String(item.Store)))
      );

      //console.log(filteredProducts, "filteredProducts");

      const processed = filteredProducts.map((item, index) => {
        const customer = filterData.Customer.find(
          (C) => String(C.value) === String(item.Client)
        );
        // Opening invoices carry Amount/RecivedAmount instead of RemainingAmount
        const remaining = Number(item.RemainingAmount ?? item.RemaingAmount ?? item.Remaining ?? (Number(item.Amount || 0) - Number(item.RecivedAmount || 0))) || 0;
        const chq = Number(item.ChqAmount ?? 0);
        return {
          id: index + 1,
          invoice: item.invoice,
          date: item.date,
          SalesflowRef: item.SalesFlowRef,
          OrderBooker:
            filterData.orderBooker.find((or) => or.value === item.OrderBooker)?.label || "",

          code: item.ClientCode || 0,
          client: customer?.name || "",

          TotalAmount: Number(item.TotalAmount ?? item.Amount ?? 0),
          RecivedAmount: Number(item.RecivedAmount ?? item.Recived ?? 0),

          RemainingAmount: (remaining + chq) || 0,

          Days: getDaysDiff(item.date),

          ChqAmount: Number(item.ChqAmount ?? 0),

          // ✅ Fixed NetAmount calculation (keeps negatives and zero correct)
          NetAmount: remaining,

          Remarks: item.Remarks || "",

          // ✅ Add conditional cheque fields only when separate cheque is enabled
          ...(filterData.sepratechq === "Yes"
            ? {
              ChqDate: item.chqDate || "",
              ChqNumber: item.chq || "",
              SeprateChqAmount: Number(item.SeprateChqAmount ?? 0),
            }
            : {}),
        };


      });
      
      let filtered = processed.filter((item) => item.RemainingAmount > 1);

      if (filterData.withRemarks === "without") {
        filtered = filtered.filter((item) => !item.Remarks || item.Remarks.trim() === "");
      }

      setRows(filtered);
    }
  }, [data, filterData.Customer, filterData.withRemarks]);

    //console.log(rows, "rows")
  //   Filter and sort rows based on user interaction
  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows
    //console.log(filtered)
    if (filter) {
      filtered = rows.filter(row =>
        Object.values(row).some(value =>
          value && value.toString().toLowerCase().includes(filter.toLowerCase())
        )
      );
    }
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [rows, filter, sortConfig]);
  //console.log(filteredAndSortedRows)
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };


  // Calculate totals for summary
// FIX: Update the totals calculation to include ChqAmount
const totals = useMemo(() => {
  return {
    totalAmount: (filteredAndSortedRows.reduce((sum, row) => sum + (row.RemainingAmount || 0), 0)),
    totalSale: filteredAndSortedRows.reduce((sum, row) => sum + (row.TotalAmount || 0), 0),
    totalRecived: filteredAndSortedRows.reduce((sum, row) => sum + (row.RecivedAmount || 0), 0),
    totalChq: filteredAndSortedRows.reduce((sum, row) => sum + (row.ChqAmount || 0), 0),
    totalNet: filteredAndSortedRows.reduce((sum, row) => sum + (row.NetAmount || 0), 0),
  };
}, [filteredAndSortedRows]);

  // Export to Excel function


  const exportToExcel = async () => {
    try {
      const mainData = filteredAndSortedRows.map(row => {
        const baseRow = {
          'S.No': row.id,
          'Invoice': row.invoice,
          'Invoice Ref': row.SalesflowRef || row.invoice,
          'Invoice Date': formatDate(row.date),
          'Order Booker': row.OrderBooker,
          'Customer Code': row.code,
          'Customer Name': row.client,
          'Total Amount': Number(Number(row.TotalAmount || 0).toFixed(2)),
          'Received Amount': Number(Number(row.RecivedAmount || 0).toFixed(2)),
          'Remaining Amount': Number(Number(row.RemainingAmount || 0).toFixed(2)),
          'Days': row.Days,
          'Net Amount': Number(Number(row.NetAmount || 0).toFixed(2)),
          'Remarks': row.Remarks || ''
        };

        if (filterData.sepratechq === "Yes") {
          baseRow['Cheque Date'] = row.ChqDate || '';
          baseRow['Cheque Number'] = row.ChqNumber || '';
          baseRow['Cheque Amount'] = Number(Number(row.ChqAmount || 0).toFixed(2));
        }

        return baseRow;
      });

      const excelTotals = {
        Invoice: 'GRAND TOTAL',
        'Total Amount': filteredAndSortedRows.reduce((sum, row) => sum + row.TotalAmount, 0),
        'Received Amount': filteredAndSortedRows.reduce((sum, row) => sum + row.RecivedAmount, 0),
        'Remaining Amount': filteredAndSortedRows.reduce((sum, row) => sum + row.RemainingAmount, 0),
        'Net Amount': filteredAndSortedRows.reduce((sum, row) => sum + row.NetAmount, 0)
      };

      if (filterData.sepratechq === "Yes") {
        excelTotals['Cheque Amount'] = filteredAndSortedRows.reduce((sum, row) => sum + row.ChqAmount, 0);
      }

      await exportProfessionalExcel({
        title: reportName,
        fileName: reportName.replace(/\s+/g, '_'),
        sheetName: reportName,
        rows: mainData,
        meta: [
          filterData.startDate && filterData.endDate
            ? `Period: ${formatDate(filterData.startDate)} to ${formatDate(filterData.endDate)}`
            : '',
        ].filter(Boolean),
        excludeKeys: ['_id', 'id'],
        totals: excelTotals,
      });

    } catch (error) {
      console.error('Excel export error:', error);
      alert("Something went wrong");
    }
  };



  // Export to Word function
  const exportToWord = async () => {
    // Prepare table rows for Word document
    const tableRows = filteredAndSortedRows.map(row =>
      new TableRow({
        children: Object.values(row).map(value =>
          new TableCell({
            children: [new Paragraph({ text: String(value) })],
          })
        ),
      })
    );

    // Create table with headers
    const headers = Object.keys(filteredAndSortedRows[0] || {});
    const table = new Table({
      rows: [
        new TableRow({
          children: headers.map(header =>
            new TableCell({
              children: [new Paragraph({ text: header, bold: true })],
            })
          ),
        }),
        ...tableRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: "Pearl Dynamics", heading: "Heading1" }),
          new Paragraph({ text: reportName }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
          new Paragraph({ text: "" }),
          table,
        ],
      }],
    });

    // Generate blob and download
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Sales_Report.docx");
  };

  // Export to PDF function

const exportToPDF = () => {
  const doc = new jsPDF("landscape");

  const watermark = "https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png";

  // Add Header
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(20);
  doc.text("Pearl Dynamic (pvt) ltdPvt Ltd", pageWidth / 2, 15, { align: "center" });
  doc.setFontSize(16);
  doc.text(reportName, pageWidth / 2, 25, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 42);

  // Table Columns
  const tableColumn = [
    "S.No",
    "Invoice",
    "Invoice Ref",
    "Invoice Date",
    "OrderBooker",
    "Customer Code",
    "Customer Name",
    "Total Amount",
    "Received Amount",
    "Remaining Amount",
    ...(filterData.sepratechq === "Yes"
      ? ["Chq Date", "Chq Number", "Chq Amount"]
      : []),
    "Days",
    "Net Amount",
    "Remarks",
  ];

  // Prepare rows
  const tableRows = filteredAndSortedRows.map(row => [
    row.id,
    row.invoice,
    row.SalesflowRef || row.invoice,
    formatDate(row.date),
    row.OrderBooker,
    row.code,
    row.client,
    row.TotalAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0",
    row.RecivedAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0",
    row.RemainingAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0",
    ...(filterData.sepratechq === "Yes"
      ? [row.ChqDate || "", row.ChqNumber || "", row.ChqAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0"]
      : []),
    row.Days || "",
    row.NetAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0",
    row.Remarks || "",
  ]);

  // Calculate totals
  const totalAmount = filteredAndSortedRows.reduce((s, r) => s + (Number(r.TotalAmount) || 0), 0);
  const totalReceived = filteredAndSortedRows.reduce((s, r) => s + (Number(r.RecivedAmount) || 0), 0);
  const totalRemaining = filteredAndSortedRows.reduce((s, r) => s + (Number(r.RemainingAmount) || 0), 0);
  const totalCheque = filteredAndSortedRows.reduce((s, r) => s + (Number(r.ChqAmount) || 0), 0);
  const totalNet = filteredAndSortedRows.reduce((s, r) => s + (Number(r.NetAmount) || 0), 0);

  // Find indexes for totals
  const idxTotalAmount = tableColumn.indexOf("Total Amount");
  const idxReceived = tableColumn.indexOf("Received Amount");
  const idxRemaining = tableColumn.indexOf("Remaining Amount");
  const idxChqAmount = tableColumn.indexOf("Chq Amount");
  const idxNet = tableColumn.indexOf("Net Amount");

  // Create totals row
  const totalsRow = new Array(tableColumn.length).fill("");
  if (idxTotalAmount >= 0) totalsRow[idxTotalAmount] = totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (idxReceived >= 0) totalsRow[idxReceived] = totalReceived.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (idxRemaining >= 0) totalsRow[idxRemaining] = totalRemaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (idxChqAmount >= 0) totalsRow[idxChqAmount] = totalCheque.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (idxNet >= 0) totalsRow[idxNet] = totalNet.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  totalsRow[0] = "TOTAL";

  tableRows.push(totalsRow);

  // Generate main table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2, valign: "middle" },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      minCellHeight: 12,
    },
    didParseCell: function (data) {
      const lastRowIndex = tableRows.length - 1;
      if (data.row.index === lastRowIndex) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
        if (data.column.index === 0) {
          data.cell.styles.halign = "center";
        }
        // Right align numeric columns
        if (data.column.index >= idxTotalAmount && data.column.index <= idxNet) {
          data.cell.styles.halign = "right";
        }
      }
    },
    didDrawPage: function () {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setGState(new doc.GState({ opacity: 0.1 }));
      doc.addImage(watermark, "PNG", pageWidth / 2 - 80, pageHeight / 2 - 50, 160, 100);
      doc.setGState(new doc.GState({ opacity: 1 }));
      doc.setFontSize(8);
      doc.text(
        "Developed by JS International | Website: https://jaffersons.com/ | Contact: 0301-8251291",
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    },
  });

  // Order Booker Summary - Using filteredAndSortedRows
  const summaryByBooker = filteredAndSortedRows.reduce((acc, row) => {
    const booker = row.OrderBooker || "Unknown";
    if (!acc[booker]) {
      acc[booker] = {
        totalAmount: 0,
        recived: 0,
        remaining: 0,
        chq: 0,
        net: 0,
      };
    }
    acc[booker].totalAmount += Number(row.TotalAmount || 0);
    acc[booker].recived += Number(row.RecivedAmount || 0);
    acc[booker].remaining += Number(row.RemainingAmount || 0);
    acc[booker].chq += Number(row.ChqAmount || 0);
    acc[booker].net += Number(row.NetAmount || 0);
    return acc;
  }, {});

  // Convert to array for table body
  const summaryData = Object.entries(summaryByBooker).map(
    ([booker, val], i) => [
      i + 1,
      booker,
      val.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      val.recived.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      val.remaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      val.chq.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      val.net.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ]
  );

  // Calculate grand totals for summary
  const grandTotals = Object.values(summaryByBooker).reduce(
    (acc, val) => {
      acc.totalAmount += val.totalAmount;
      acc.recived += val.recived;
      acc.remaining += val.remaining;
      acc.chq += val.chq;
      acc.net += val.net;
      return acc;
    },
    { totalAmount: 0, recived: 0, remaining: 0, chq: 0, net: 0 }
  );

  // Add TOTAL row to summary
  summaryData.push([
    "",
    "TOTAL",
    grandTotals.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    grandTotals.recived.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    grandTotals.remaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    grandTotals.chq.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    grandTotals.net.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  ]);

  // Add summary table
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("Order Booker-wise Summary", 105, finalY, { align: "center" });

  autoTable(doc, {
    startY: finalY + 5,
    head: [["S.No", "Order Booker", "Total", "Received", "Remaining", "Cheque", "Net"]],
    body: summaryData,
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    bodyStyles: { halign: "right" },
    didParseCell: function (data) {
      const lastRowIndex = summaryData.length - 1;
      if (data.row.index === lastRowIndex) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
        if (data.column.index === 0 || data.column.index === 1) {
          data.cell.styles.halign = "center";
        }
      }
      // Left align the Order Booker column
      if (data.column.index === 1 && data.row.index !== lastRowIndex) {
        data.cell.styles.halign = "left";
      }
    },
  });

  // Footer
  doc.setFontSize(9);
  doc.text("Generated on: " + new Date().toLocaleString(), 10, 290);
  doc.text("Pearl Dynamic (pvt) ltdSystem", 180, 290, { align: "right" });
  
  doc.save(`${reportName.replace(/\s+/g, '_')}.pdf`);
};

  const OpenInvoice = () => {
    window.open("", "_blank", "width=1200,height=800");
  }


  // Print function
  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    // Write the content and styles into new print window
    printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
            background: #fff;
            color: #333;
            padding: 20px;
          }
          .sales-report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eaeaea;
          }
          .company-info {
            text-align: left;
          }
          .company-name {
            font-size: 24px;
            font-weight: 700;
            color: #2c3e50;
            margin: 0 0 8px 0;
          }
          .report-info {
            text-align: right;
          }
          .report-title {
            font-size: 20px;
            font-weight: 600;
            color: #3498db;
            margin: 0 0 8px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          th {
            background: #f8f9fa;
            padding: 12px 10px;
            text-align: left;
            font-weight: 600;
            color: #2c3e50;
            border-bottom: 2px solid #e0e0e0;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #eaeaea;
          }
          .numeric {
            text-align: right;
          }
          .footer-total {
            font-weight: 700;
            background: #f8f9fa;
          }
          .print-footer {
            margin-top: 40px;
            font-size: 12px;
            text-align: center;
            color: #555;
            border-top: 1px solid #ccc;
            padding-top: 10px;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${printContent}
        <div class="print-footer">
          Developed by JS International | Website: <a href="https://jaffersons.com/" target="_blank">https://jaffersons.com/</a> | Contact: 0301-8251291
        </div>
      </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();

    // Give it a tick to load content, then print
    setTimeout(() => {
      printWindow.print();
      // Don't close immediately to allow user to see print dialog
    }, 500);
  };



  return (
    <div className="sales-report-container" ref={reportRef}>
      <ReportPopupHeader title={title} />

      <div className="watermark">
        <div className="watermark-content">
          <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png" alt="" />
        </div>
      </div>

      <div className="sales-report-header">
        <div className="company-info">
          <h2 className="company-name">Pearl Dynamics</h2>
          <p className="company-RemainingAmount">123 Business Avenue, Suite 456</p>
          <p className="company-contact">Phone: (555) 123-4567 | Email: info@pmmgmt.com</p>
        </div>
        <div className="report-info">
          <h1 className="report-title">{title}</h1>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">
            {filteredAndSortedRows.length > 0
              ? `Period: ${filteredAndSortedRows[0].date} to ${filteredAndSortedRows[filteredAndSortedRows.length - 1].date}`
              : 'No data available'
            }
          </p>
        </div>
      </div>

      <div className="report-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search sales data..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="summary-stats">
          <span className="stat-item">
            Total Recivable: <strong>{totals.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </span>

          <span className="stat-item">
            Transactions: <strong>{filteredAndSortedRows.length}</strong>
          </span>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
          </div>
        ) :
          (<table className="sales-data-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('id')}># {sortConfig.key === 'id' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('date')}>Date {sortConfig.key === 'date' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('invoice')}>Invoice {sortConfig.key === 'invoice' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('SalesFlowRef')}>SalesFlowRef {sortConfig.key === 'SalesFlowRef' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('OrderBooker')}>OrderBooker {sortConfig.key === 'OrderBooker' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('code')}>Client Code {sortConfig.key === 'code' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('Client')}>Client  {sortConfig.key === 'ClientCode' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('TotalAmount')}>TotalAmount {sortConfig.key === 'TotalAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('RecivedAmount')}>RecivedAmount {sortConfig.key === 'RecivedAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('RemainingAmount')}>RemainingAmount {sortConfig.key === 'RemainingAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                {filterData.sepratechq === "Yes" ?
                  <>
                    <th onClick={() => requestSort('ChqDate')}>ChqDate {sortConfig.key === 'ChqDate' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => requestSort('ChqNumber')}>ChqNumber {sortConfig.key === 'ChqNumber' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => requestSort('ChqAmount')}>ChqAmount {sortConfig.key === 'ChqAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  </> : null}
                <th onClick={() => requestSort('Days')}>Days {sortConfig.key === 'Days' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('NetAmount')}>NetAmount {sortConfig.key === 'NetAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('Remarks')}>Remarks {sortConfig.key === 'Remarks' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length > 0 ? (
                filteredAndSortedRows.map((row) => (
                  <tr key={row.id} className={row.status === 'Pending' ? 'row-pending' : ''}>
                    <td>{row.id}</td>
                    <td style={{ minWidth: "100px" }}>{row.date}</td>
                    <td className="invoice-number" onClick={() => OpenInvoice()}>{row.invoice}</td>
                    <td>{row.SalesflowRef}</td>
                    <td>{row.OrderBooker}</td>
                    <td>{row.code}</td>
                    <td>{row.client}</td>
                    <td className='numeric'>{Number(row.TotalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className='numeric'>{Number(row.RecivedAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className='numeric'>{Number(row.RemainingAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    {filterData.sepratechq === "Yes" ?
                      <>
                        <td className='numeric'>{row?.ChqDate}</td>
                        <td className='numeric'>{row?.ChqNumber?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className='numeric'>{row?.ChqAmount}</td>
                      </>
                      : null
                    }
                    <td>{row.Days}</td>
                    <td className='numeric'> {Math.abs(Number(row?.ChqAmount - Number(row.RemainingAmount))).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{row.Remarks || ""}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="17" className="no-data">
                    No matching records found
                  </td>
                </tr>
              )}
            <tr className="footer-row">
  <td className="footer-total">Totals</td>
  <td className="footer-total"></td>
  <td className="footer-total"></td>
  <td className="footer-total"></td>
  <td className="footer-total"></td>
  <td className="footer-total"></td>
  <td className="footer-total"></td>
  <td className="numeric footer-total">{totals.totalSale.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
  <td className="numeric footer-total">{totals.totalRecived.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
  <td className="numeric footer-total">{totals.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
  {filterData.sepratechq === "Yes" ? (
    <>
      <td className="footer-total"></td>
      <td className="footer-total"></td>
  
    </>
  ) : null}
  <td className="numeric footer-total">{totals.totalChq.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td className="footer-total"></td>
  

  <td className="numeric footer-total">{totals.totalNet.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
  <td className="footer-total"></td>
</tr>
            </tbody>
          </table>)}
      </div>

      <div className="report-actions">
        <button className="btn btn-word" onClick={exportToWord}>
          Download Word
        </button>
        <button className="btn btn-excel" onClick={exportToExcel}>
          Download Excel
        </button>
        <button className="btn btn-pdf" onClick={exportToPDF}>
          Download PDF
        </button>
        <button className="btn btn-print" onClick={handlePrint}>
          Print Report
        </button>
      </div>

      <style jsx>{`
        .loader-wrapper {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 200px;
          gap: 14px;
        }
          .spinner {
          width: 48px;
          height: 48px;
          border: 6px solid #ccc;
          border-top: 6px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .sales-report-container {
          font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          margin: 20px auto;
          max-width: 1400px;
          color: #333;
          position: relative;
          overflow: scroll;
        }
        
        .watermark {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 1;
          opacity: 0.05;
        }
        
        .watermark-content {
          text-align: center;
          transform: rotate(-45deg);
        }
        
        .watermark-logo {
          font-size: 120px;
          font-weight: bold;
          color: #2c3e50;
          line-height: 1;
        }
        
        .watermark-text {
          font-size: 40px;
          font-weight: bold;
          color: #2c3e50;
          margin-top: 10px;
        }
        
        .watermark-subtext {
          font-size: 30px;
          color: #2c3e50;
          margin-top: 5px;
        }
        
        .sales-report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eaeaea;
          position: relative;
          z-index: 2;
        }
        
        .company-info {
          text-align: left;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: 700;
          color: #2c3e50;
          margin: 0 0 8px 0;
        }
        
        .company-RemainingAmount, .company-contact {
          font-size: 12px;
          color: #7f8c8d;
          margin: 4px 0;
        }
        
        .report-info {
          text-align: right;
        }
        
        .report-title {
          font-size: 20px;
          font-weight: 600;
          color: #3498db;
          margin: 0 0 8px 0;
        }
        
        .report-date, .report-range {
          font-size: 12px;
          color: #7f8c8d;
          margin: 4px 0;
        }
        
        .report-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 16px;
          position: relative;
          z-index: 2;
        }
        
        .search-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          min-width: 250px;
        }
        
        .summary-stats {
          display: flex;
          gap: 24px;
        }
        
        .stat-item {
          font-size: 14px;
          color: #555;
        }
        
   .table-container {
  overflow-x: auto;   
  overflow-y: hidden;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
  -webkit-overflow-scrolling: touch; 
}
        
       .sales-data-table {
  min-width: 1200px;  
  border-collapse: collapse;
  font-size: 14px;
  width: 100%;
}
        
        .sales-data-table th {
          background: #f8f9fa;
          padding: 12px 10px;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
          border-bottom: 2px solid #e0e0e0;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        
        .sales-data-table th:hover {
          background: #e9ecef;
        }
        
        .sales-data-table td {
          padding: 10px;
          border-bottom: 1px solid #eaeaea;
        }
        
        .sales-data-table tbody tr:hover {
          background-color: #f8f9fa;
        }
        
        .row-pending {
          background-color: #fff9e6;
        }
        
        .row-pending:hover {
          background-color: #ffeeb5;
        }
        
        .numeric {
          text-align: right;
        }
        
        .currency {
          font-family: 'Courier New', monospace;
        }
        
        .invoice-number, .sku-code {
          font-family: 'Courier New', monospace;
          font-weight: 600;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .status-badge.posted {
          background: #e7f4e4;
          color: #2ecc71;
        }
        
        .status-badge.pending {
          background: #fef5e7;
          color: #f39c12;
        }
        
        .no-data {
          text-align: center;
          padding: 30px;
          color: #95a5a6;
          font-style: italic;
        }
        
        tfoot {
          border-top: 2px solid #e0e0e0;
        }
        
        .footer-total {
          font-weight: 700;
          background: #f8f9fa;
        }
        
        .report-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          position: relative;
          z-index: 2;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn-word {
          background: #2b579a;
          color: white;
        }
        
        .btn-word:hover {
          background: #1e3f6e;
        }
        
        .btn-excel {
          background: #217346;
          color: white;
        }
        
        .btn-excel:hover {
          background: #18532f;
        }
        
        .btn-pdf {
          background: #f40f02;
          color: white;
        }
        
        .btn-pdf:hover {
          background: #c30c01;
        }
        
        .btn-print {
          background: #555;
          color: white;
        }
        
        .btn-print:hover {
          background: #333;
        }
        
        @media (max-width: 1200px) {
          .sales-report-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .company-info, .report-info {
            text-align: center;
            margin-bottom: 16px;
          }
          
          .report-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-input {
            min-width: 100%;
          }
          
          .summary-stats {
            justify-content: space-around;
          }
          
          .report-actions {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
        
        @media print {
  .sales-report-container {
    box-shadow: none;
    padding: 0;
  }
  
  .report-controls, .report-actions {
    display: none;
  }
  
  .table-container {
    overflow: visible !important;  /* ✅ allow full table */
    border: none;
  }
  
  .watermark {
    opacity: 0.03;
  }

  .footer-total {
    font-weight: bold;
    background: #f0f0f0 !important; /* ✅ keep totals visible in print */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
        }
      `}</style>
    </div>
  );
};

export default InvoiceAgingPopup;