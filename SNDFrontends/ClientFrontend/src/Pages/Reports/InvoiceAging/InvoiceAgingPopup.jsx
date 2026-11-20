import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";

import { ConvetDate } from '../../../Components/Global/getDate';
import { getDataFundtion } from '../../../Api/CurdFunctions';

const InvoiceAgingPopup = ({ filterData = [] }) => {
  console.log(filterData)
  const [isLoading, setIsLoading] = useState(false);
  const { startDate, endDate } = filterData
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([])

  const getDaysDiff = (dateString) => {
    if (!dateString) return 0;
    const givenDate = new Date(dateString);
    const today = new Date();
    const diffTime = today - givenDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateValue) => {
    if (dateValue == "") {
      return ""
    }
    let date;

    if (typeof dateValue === "number") {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const daysInMs = dateValue * 24 * 60 * 60 * 1000;
      date = new Date(excelEpoch.getTime() + daysInMs);
    } else {
      date = new Date(dateValue);
    }

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

  const getData = async () => {
    setIsLoading(true);

    try {
      const distributorIds = Array.isArray(filterData.allowedDistributorIds) && filterData.allowedDistributorIds.length
        ? filterData.allowedDistributorIds.map(String)
        : (filterData.loginVendor ? [String(filterData.loginVendor)] : []);
      const chunks = await Promise.all(distributorIds.map(async (id) => {
        try {
          const gettingdata = await getDataFundtion(
            `/SalesInvoice/InvoiceAging?startDate=${filterData.startDate}&endDate=${filterData.endDate}&Distrbutor=${id}`
          );
          return {
            alldata: gettingdata?.alldata || [],
            chqInv: gettingdata?.chqInv || [],
          };
        } catch (err) {
          console.log(err);
          return { alldata: [], chqInv: [] };
        }
      }));
      const allowed = new Set(distributorIds);
      const alldataArray = chunks
        .flatMap((chunk) => chunk.alldata)
        .filter((item) => allowed.has(String(item.Distrbutor)));
      const chqInvArray = chunks.flatMap((chunk) => chunk.chqInv);
      console.log(alldataArray , "invoice");
      console.log("alldata sample:", alldataArray[0]);
      console.log("chqInv sample:", chqInvArray[0]);

      // Process the data
      const processedData = alldataArray.map(item => {
        const customer = filterData.Customer?.find(C => String(C.value) === String(item.Client));
        const OrderBooker = filterData.OrderBooker?.find(O => String(O.value) === String(item.OrderBooker));
        const invoiceKey = item.DisSalesInvoice || item.SalesInvoice;
        const invoiceKeys = [item.SalesInvoice, item.DisSalesInvoice]
          .filter((v) => v != null && v !== "")
          .map(String);
        
        // Find all cheques for this invoice (match numeric SalesInvoice or DisSalesInvoice)
        const invoiceCheques = chqInvArray.filter((chq) => {
          const chqKeys = [chq.SalesInvoice, chq.DisSalesInvoice]
            .filter((v) => v != null && v !== "")
            .map(String);
          return chqKeys.some((k) => invoiceKeys.includes(k));
        });

        // Calculate total cheque amount for this invoice
        const totalChqAmount = invoiceCheques.reduce(
          (sum, chq) => sum + (Number(chq.Amount) || 0), 
          0
        );

        // Format cheque numbers and dates for display
        const chqNumbers = invoiceCheques.map(chq => chq.ChqNumber).join(", ");
        const chqDates = invoiceCheques.map(chq => chq.ChqDate).join(", ");
        const chqAmounts = invoiceCheques.map(chq => chq.Amount).join(", ");

        return {
          _id: item._id,
          DisSalesInvoice: invoiceKey,
          SalesInvoiceDate: item.SalesInvoiceDate || item.date,
          OrderBooker: OrderBooker?.label || item.OrderBooker || "",
          LoadFormNumber: item.LoadFormNumber,
          Client: item.Client,
          Distrbutor: item.Distrbutor,
          Recived: Number(item.Recived) || 0,
          Remaining: Number(item.Remaining) || Number(item.Totalamount) || 0,
          Totalamount: Number(item.Totalamount) || 0,
          
          // For the report
          invoice: invoiceKey,
          date: item.SalesInvoiceDate || item.date,
          ClientName: customer?.name || item.Client || "",
          ClientCode: customer?.SalesFlowRef || "",
          
          // Cheque related
          chq: chqNumbers,
          chqDate: chqDates,
          ChqAmount: totalChqAmount,
          SeprateChqAmount: chqAmounts,
          chqDetails: invoiceCheques
        };
      });

      setData(processedData);

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
      const processed = data.map((item, index) => {
        const customer = filterData.Customer?.find(
          (C) => String(C.value) === String(item.Client)
        );
        
        // Calculate remaining amount properly
        const remaining = Number(item.Remaining ?? 0);
        const chqAmount = Number(item.ChqAmount ?? 0);
        
        // Net amount is the actual remaining after considering cheques
        const netAmount =remaining - chqAmount;
        
        
        return {
          id: index + 1,
          invoice: item.DisSalesInvoice || item.invoice,
          date: item.SalesInvoiceDate,
          SalesflowRef: item.SalesFlowRef || item.LoadFormNumber || "",
          OrderBooker: filterData.orderBooker?.find((or) => or.value === item.OrderBooker)?.label || item.OrderBooker || "",
          code: customer?.SalesFlowRef || item.ClientCode || "",
          client: customer?.name || item.ClientName || item.Client,
          TotalAmount: Number(item.Totalamount || item.TotalAmount || 0),
          RecivedAmount: Number(item.Recived) ,
          RemainingAmount: Math.abs(remaining) , 
          Days: getDaysDiff(item.SalesInvoiceDate || item.date),
          ChqAmount: chqAmount,
          NetAmount: netAmount,
          status: remaining > 0 ? "Pending" : remaining < 0 ? "Overpaid" : "Paid",
          
          // Add cheque details if separate cheque feature is enabled
          
            ChqDate: item.chqDate || "",
            ChqNumber: item.chq || "",
            SeprateChqAmount: item.SeprateChqAmount || "",
          
        };
      });

      let filtered = processed;
      setRows(filtered);
    }
  }, [data, filterData.Customer, filterData.orderBooker, filterData.sepratechq]);

  // Filter and sort rows based on user interaction
  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows
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

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Calculate totals for summary
  const totals = useMemo(() => {
    return {
      totalAmount: filteredAndSortedRows.reduce((sum, row) => sum + (Math.abs(row.RemainingAmount) || 0), 0),
      totalSale: filteredAndSortedRows.reduce((sum, row) => sum + (row.TotalAmount || 0), 0),
      totalRecived: filteredAndSortedRows.reduce((sum, row) => sum + (row.RecivedAmount || 0), 0),
      totalChq: filteredAndSortedRows.reduce((sum, row) => sum + (row.ChqAmount || 0), 0),
      totalNet: filteredAndSortedRows.reduce((sum, row) => sum + (row.NetAmount || 0), 0),
    };
  }, [filteredAndSortedRows]);

  // Export to Excel function
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const mainData = filteredAndSortedRows.map(row => {
        const baseRow = {
          'S.No': row.id,
          'DisSalesInvoice': row.invoice,
          'Invoice Ref': row.SalesflowRef || row.invoice,
          'Invoice Date': formatDate(row.date),
          'Order Booker': row.OrderBooker,
          'Customer Code': row.code,
          'Customer Name': row.client,
          'Total Amount': row.TotalAmount,
          'Received Amount': row.RecivedAmount,
          'Remaining Amount': row.RemainingAmount,
          'Days': row.Days,
          'Net Amount': row.NetAmount
        };

        
          baseRow['Cheque Date'] = row.ChqDate || '';
          baseRow['Cheque Number'] = row.ChqNumber || '';
          baseRow['Cheque Amount'] = row.ChqAmount || 0;
        

        return baseRow;
      });

      const ws = XLSX.utils.json_to_sheet(mainData);

      const colWidths = [
        { wch: 8 },  // S.No
        { wch: 12 }, // Invoice
        { wch: 15 }, // Invoice Ref
        { wch: 12 }, // Invoice Date
        { wch: 20 }, // Order Booker
        { wch: 15 }, // Customer Code
        { wch: 30 }, // Customer Name
        { wch: 15 }, // Total Amount
        { wch: 15 }, // Received Amount
        { wch: 15 }, // Remaining Amount
      ];

      if (filterData.sepratechq === "Yes") {
        colWidths.push({ wch: 12 }); // Cheque Date
        colWidths.push({ wch: 15 }); // Cheque Number
        colWidths.push({ wch: 15 }); // Cheque Amount
      }

      colWidths.push({ wch: 8 });  // Days
      colWidths.push({ wch: 15 }); // Net Amount

      ws['!cols'] = colWidths;

      const range = XLSX.utils.decode_range(ws['!ref']);

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[address]) continue;

        ws[address].s = {
          font: {
            bold: true,
            color: { rgb: "FFFFFF" }
          },
          fill: {
            fgColor: { rgb: "2C3E50" }
          },
          alignment: {
            horizontal: "center",
            vertical: "center"
          }
        };
      }

      const numericColumns = ['Total Amount', 'Received Amount', 'Remaining Amount', 'Cheque Amount', 'Net Amount'];
      const dateColumns = ['Invoice Date', 'Cheque Date'];

      for (let R = 1; R <= range.e.r; ++R) {
        for (let C = 0; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[address]) continue;

          const cell = ws[address];
          const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
          const headerValue = ws[headerCell]?.v;

          if (numericColumns.includes(headerValue) && typeof cell.v === 'number') {
            cell.s = {
              ...cell.s,
              numFmt: '" "#,##0.00_);(" "#,##0.00)'
            };
          }

          if (dateColumns.includes(headerValue) && cell.v) {
            cell.s = {
              ...cell.s,
              numFmt: 'dd-mmm-yyyy'
            };
          }

          cell.s = {
            ...cell.s,
            alignment: {
              ...cell.s?.alignment,
              vertical: "center",
              horizontal: typeof cell.v === 'number' ? "right" : "left"
            }
          };
        }
      }

      const totalRowIndex = range.e.r + 2;

      const totalLabelCell = XLSX.utils.encode_cell({ r: totalRowIndex, c: 0 });
      ws[totalLabelCell] = { v: "GRAND TOTAL", t: "s" };
      ws[totalLabelCell].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "ECF0F1" } },
        alignment: { horizontal: "center", vertical: "center" }
      };

      const headerMap = {};
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
        if (ws[headerCell]) {
          headerMap[ws[headerCell].v] = C;
        }
      }

      const totals = {
        'Total Amount': filteredAndSortedRows.reduce((sum, row) => sum + row.TotalAmount, 0),
        'Received Amount': filteredAndSortedRows.reduce((sum, row) => sum + row.RecivedAmount, 0),
        'Remaining Amount': filteredAndSortedRows.reduce((sum, row) => sum + row.RemainingAmount, 0),
        'Net Amount': filteredAndSortedRows.reduce((sum, row) => sum + row.NetAmount, 0)
      };

      if (filterData.sepratechq === "Yes") {
        totals['Cheque Amount'] = filteredAndSortedRows.reduce((sum, row) => sum + row.ChqAmount, 0);
      }

      Object.entries(totals).forEach(([header, value]) => {
        const colIndex = headerMap[header];
        if (colIndex !== undefined) {
          const cellAddress = XLSX.utils.encode_cell({ r: totalRowIndex, c: colIndex });
          ws[cellAddress] = { v: value, t: "n" };
          ws[cellAddress].s = {
            font: { bold: true },
            numFmt: '" "#,##0.00_);(" "#,##0.00)',
            fill: { fgColor: { rgb: "ECF0F1" } },
            alignment: { horizontal: "right", vertical: "center" }
          };
        }
      });

      XLSX.utils.book_append_sheet(wb, ws, "Invoice Aging Report");

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const fileData = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const fileName = `Invoice_Aging_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(fileData, fileName);

    } catch (error) {
      console.error('Excel export error:', error);
      alert("Something went wrong");
    }
  };

  // Export to Word function
  const exportToWord = async () => {
    const tableRows = filteredAndSortedRows.map(row =>
      new TableRow({
        children: Object.values(row).map(value =>
          new TableCell({
            children: [new Paragraph({ text: String(value) })],
          })
        ),
      })
    );

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

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: "Pearl Dynamics", heading: "Heading1" }),
          new Paragraph({ text: "Invoice Aging" }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
          new Paragraph({ text: "" }),
          table,
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Sales_Report.docx");
  };

  // Export to PDF function
  const exportToPDF = () => {
    const doc = new jsPDF("landscape");

    const watermark = "https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png";

    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(20);
    doc.text("Pearl Dynamic Pvt Ltd", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(16);
    doc.text("Invoice Aging Report", pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 42);

    const tableColumn = [
      "S.No",
      "DisSalesInvoice",
      "Invoice Ref",
      "Invoice Date",
      "OrderBooker",
      "Customer Code",
      "Customer Name",
      "Total Amount",
      "Received Amount",
      "Remaining Amount",
      
      "Chq Date", "Chq Number", "Chq Amount",
        
      "Days",
      "Net Amount",
    ];

    const tableRows = filteredAndSortedRows.map(row => [
      row.id,
      row.invoice,
      row.SalesflowRef || row.invoice,
      formatDate(row.date),
      row.OrderBooker,
      row.code,
      row.client,
      row.TotalAmount?.toLocaleString() || "0",
      row.RecivedAmount?.toLocaleString() || "0",
      row.RemainingAmount?.toLocaleString() || "0",
      ...(filterData.sepratechq === "Yes"
        ? [row.ChqDate || "", row.ChqNumber || "", row.ChqAmount?.toLocaleString() || "0"]
        : []),
      row.Days || "",
      row.NetAmount?.toLocaleString() || "0",
    ]);

    const totalAmount = filteredAndSortedRows.reduce((s, r) => s + (Number(r.TotalAmount) || 0), 0);
    const totalReceived = filteredAndSortedRows.reduce((s, r) => s + (Number(r.RecivedAmount) || 0), 0);
    const totalRemaining = filteredAndSortedRows.reduce((s, r) => s + (Number(r.RemainingAmount) || 0), 0);
    const totalCheque = filteredAndSortedRows.reduce((s, r) => s + (Number(r.ChqAmount) || 0), 0);
    const totalNet = filteredAndSortedRows.reduce((s, r) => s + (Number(r.NetAmount) || 0), 0);

    const idxTotalAmount = tableColumn.indexOf("Total Amount");
    const idxReceived = tableColumn.indexOf("Received Amount");
    const idxRemaining = tableColumn.indexOf("Remaining Amount");
    const idxChqAmount = tableColumn.indexOf("Chq Amount");
    const idxNet = tableColumn.indexOf("Net Amount");

    const totalsRow = new Array(tableColumn.length).fill("");
    if (idxTotalAmount >= 0) totalsRow[idxTotalAmount] = totalAmount.toLocaleString();
    if (idxReceived >= 0) totalsRow[idxReceived] = totalReceived.toLocaleString();
    if (idxRemaining >= 0) totalsRow[idxRemaining] = totalRemaining.toLocaleString();
    if (idxChqAmount >= 0) totalsRow[idxChqAmount] = totalCheque.toLocaleString();
    if (idxNet >= 0) totalsRow[idxNet] = totalNet.toLocaleString();
    totalsRow[0] = "TOTAL";

    tableRows.push(totalsRow);

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
          if (data.column.index >= idxTotalAmount && data.column.index <= idxNet) {
            data.cell.styles.halign = "right";
          }
        }
      },
      didDrawPage: function (data) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setGState(new doc.GState({ opacity: 0.1 }));
        doc.addImage(watermark, "PNG", pageWidth / 2 - 80, pageHeight / 2 - 50, 160, 100);
        doc.setGState(new doc.GState({ opacity: 1 }));
        doc.setFontSize(8);
        doc.text(
          "Developed by JS International | / | ",
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      },
    });

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

    const summaryData = Object.entries(summaryByBooker).map(
      ([booker, val], i) => [
        i + 1,
        booker,
        val.totalAmount.toLocaleString(),
        val.recived.toLocaleString(),
        val.remaining.toLocaleString(),
        val.chq.toLocaleString(),
        val.net.toLocaleString(),
      ]
    );

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

    summaryData.push([
      "",
      "TOTAL",
      grandTotals.totalAmount.toLocaleString(),
      grandTotals.recived.toLocaleString(),
      grandTotals.remaining.toLocaleString(),
      grandTotals.chq.toLocaleString(),
      grandTotals.net.toLocaleString()
    ]);

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
        if (data.column.index === 1 && data.row.index !== lastRowIndex) {
          data.cell.styles.halign = "left";
        }
      },
    });

    doc.setFontSize(9);
    doc.text("Generated on: " + new Date().toLocaleString(), 10, 290);
    doc.text("Pearl Dynamic System", 180, 290, { align: "right" });
    
    doc.save("Invoice_Aging_Report.pdf");
  };

  const OpenInvoice = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=800");
  }

  // Print function
  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
    <html>
      <head>
        <title>Invoice Aging</title>
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
          | Website: <a href="https://jaffersons.com/" target="_blank">https://jaffersons.com/</a> | 
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
    <div className="sales-report-container" ref={reportRef}>
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
          <h1 className="report-title">Invoice Aging</h1>
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
            Total Recivable: <strong>{totals.totalAmount.toLocaleString()}</strong>
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
        ) : (
          <table className="sales-data-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('id')}># {sortConfig.key === 'id' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('date')}>Date {sortConfig.key === 'date' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('invoice')}>DisSalesInvoice {sortConfig.key === 'invoice' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('SalesflowRef')}>SalesFlowRef {sortConfig.key === 'SalesflowRef' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('OrderBooker')}>OrderBooker {sortConfig.key === 'OrderBooker' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('code')}>Client Code {sortConfig.key === 'code' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('client')}>Client {sortConfig.key === 'client' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('TotalAmount')}>TotalAmount {sortConfig.key === 'TotalAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('RecivedAmount')}>RecivedAmount {sortConfig.key === 'RecivedAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('RemainingAmount')}>RemainingAmount {sortConfig.key === 'RemainingAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                
                
                    <th onClick={() => requestSort('ChqDate')}>ChqDate {sortConfig.key === 'ChqDate' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => requestSort('ChqNumber')}>ChqNumber {sortConfig.key === 'ChqNumber' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => requestSort('ChqAmount')}>ChqAmount {sortConfig.key === 'ChqAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                
                <th onClick={() => requestSort('Days')}>Days {sortConfig.key === 'Days' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('NetAmount')}>NetAmount {sortConfig.key === 'NetAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length > 0 ? (
                filteredAndSortedRows.map((row) => (
                  <tr key={row.id} className={row.status === 'Pending' ? 'row-pending' : ''}>
                    <td>{row.id}</td>
                    <td style={{ minWidth: "100px" }}>{row.date}</td>
                    <td className="invoice-number" >{row.invoice}</td>
                    <td>{row.SalesflowRef}</td>
                    <td>{row.OrderBooker}</td>
                    <td>{row.code}</td>
                    <td>{row.client}</td>
                    <td className='numeric'>{Number(row.TotalAmount).toLocaleString()}</td>
                    <td className='numeric'>{Number(row.RecivedAmount).toLocaleString()}</td>
                    <td className='numeric'>{Number(row.RemainingAmount).toLocaleString()}</td>
                    
                    
                        <td className='numeric'>{row?.ChqDate}</td>
                        <td className='numeric'>{row?.ChqNumber}</td>
                        <td className='numeric'>{row?.ChqAmount?.toLocaleString()}</td>
                    
                    <td>{row.Days}</td>
                    <td className='numeric'>{Number(row.NetAmount).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="16" className="no-data">
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
                <td className="numeric footer-total">{totals.totalSale.toLocaleString()}</td>
                <td className="numeric footer-total">{totals.totalRecived.toLocaleString()}</td>
                <td className="numeric footer-total">{totals.totalAmount.toLocaleString()}</td>
                
                
                    <td className="footer-total"></td>
                                      <td className="footer-total"></td>
                
                  <td className="numeric footer-total">{totals.totalChq.toLocaleString()}</td>
                
                <td className="footer-total"></td>
                <td className="numeric footer-total">{totals.totalNet.toLocaleString()}</td>
               </tr>
            </tbody>
          </table>
        )}
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
          justify-content: center;
          align-items: center;
          height: 200px;
        }
        .spinner {
          width: 48px;
          height: 48px;
          border: 6px solid #ccc;
          border-top: 6px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
            overflow: visible !important;
            border: none;
          }
          
          .watermark {
            opacity: 0.03;
          }

          .footer-total {
            font-weight: bold;
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceAgingPopup;