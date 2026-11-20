import React, { use, useRef, useState } from "react";
import { get, set } from "react-hook-form";
import { getDataFundtion } from "../../../../Api/CRUDFunctions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { exportProfessionalExcel } from "../../../../utils/exportProfessionalExcel";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } from "docx";import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';
import { fmt2 } from "../../../../utils/round2";


const DailySalesReportPopup = (fillterData) => {
  const reportRef = useRef();
  const [isLoading, setIsLoading] = useState(false);
  //console.log(fillterData, "fillterData")
  const [data, setData] = useState([]);
  //console.log(data)
  // Transform rows




  
  const rows = data.map((item, index) => ({
    id: index + 1,
    date: item.SalesInvoiceDate,
    invoice: item.SalesInvoice,
    client: "Client Name",
    ClientSalesFlow: "ClientRef123",
    code: "C001",
    NTN: "123456789",
    STN: "987654321",
    SalesFlowRef: item.SalesFlowRef,
    Location: "Main Branch",
    Store: "Store A",
    TotalAmount: item.TotalAmount,
    RecivedAmount: item.RecivedAmount,
    RemainingAmount: item.RemainingAmount,
    Days: Math.floor(
      (new Date() - new Date(item.SalesInvoiceDate)) /
      (1000 * 60 * 60 * 24)
    ),
  }));



  // Totals
  const totals = {
    totalSale: rows.reduce((sum, row) => sum + row.TotalAmount, 0),
    totalRecived: rows.reduce((sum, row) => sum + row.RecivedAmount, 0),
    totalRemaining: rows.reduce(
      (sum, row) => sum + row.RemainingAmount,
      0
    ),
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getData = async (data) => {
    setIsLoading(true);
    try {
      //console.log(fillterData.data.store)
      const res = await getDataFundtion(`saleInvoice/getOnlyInvoiceAging1?startDate=${fillterData.data.startDate}&endDate=${fillterData.data.endDate}&store=${fillterData.data.store}&onlyCurrunt=true&OrderBooker=${fillterData.data.OrderBooker.length == 0 ? "All" : fillterData.data.OrderBooker}`, data);
      if (fillterData.data.store.length !== 0) {
        const filter = res.data.filter(item => String(fillterData.data.store).includes(item?.Store?.toString()));
        setData(filter);

      }
      else {

        setData(res.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }

  }

  useState(() => {
    getData()
  }, [])

 const getPaymentDetail = (row) => {
    const details = row.PaymentDetail || [];
    let chequeNumber = "";
    let chequeAmount = 0;
    let cashAmount = 0;

    for (let i = details.length - 1; i >= 0; i--) {
      const p = details[i];
      if (Array.isArray(p)) {
        for (let j = p.length - 1; j >= 0; j--) {
          if (!chequeNumber && (p[j]?.Type === "Chq" || p[j]?.type === "Chq")) {
            chequeNumber = p[j].ChqNumber || "";
            chequeAmount = p[j].Amount || 0;
          }
          if (cashAmount === 0 && (p[j]?.Type === "Cash" || p[j]?.type === "Cash")) {
            cashAmount = p[j].Amount || 0;
          }
        }
      } else if (p) {
        if (!chequeNumber && (p.Type === "Chq" || p.type === "Chq")) {
          chequeNumber = p.ChqNumber || "";
          chequeAmount = p.Amount || 0;
        }
        if (cashAmount === 0 && (p.Type === "Cash" || p.type === "Cash")) {
          cashAmount = p.Amount || 0;
        }
      }
    }

    const shortage = Number(row.Shortage) || 0;
    return { chequeNumber, chequeAmount, cashAmount, shortage };
  };

  const getLastCheque = (row) => {
    const details = row.PaymentDetail || [];
    for (let i = details.length - 1; i >= 0; i--) {
      const p = details[i];
      if (Array.isArray(p)) {
        for (let j = p.length - 1; j >= 0; j--) {
          if (p[j]?.Type === "Chq" || p[j]?.type === "Chq") return p[j].Amount || 0;
        }
      } else if (p?.Type === "Chq" || p?.type === "Chq") {
        return p.Amount || 0;
      }
    }
    return 0;
  };

  const getLastCash = (row) => {
    const details = row.PaymentDetail || [];
    for (let i = details.length - 1; i >= 0; i--) {
      const p = details[i];
      if (Array.isArray(p)) {
        for (let j = p.length - 1; j >= 0; j--) {
          if (p[j]?.Type === "Cash" || p[j]?.type === "Cash") return p[j].Amount || 0;
        }
      } else if (p?.Type === "Cash" || p?.type === "Cash") {
        return p.Amount || 0;
      }
    }
    return 0;
  };
 const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text("Daily Sales Report", 14, 15);
    
    // Add date range if available
    if (fillterData.data?.startDate && fillterData.data?.endDate) {
      doc.setFontSize(10);
      doc.text(`Date Range: ${fillterData.data.startDate} to ${fillterData.data.endDate}`, 14, 22);
    }

    // Prepare table data
    const tableColumn = [
      "Invoice No",
      "Sales Flow Ref", 
      "Invoice Date",
      "Customer Code",
      "Customer Name",
      "Store",
      "Order Booker",
      "Bill Amount",
      "Cheque No",
      "Cheque Amount",
      "Cash Amount",
      "Credit Amount"
    ];

    const tableRows = data.map(row => {
      const { chequeNumber, chequeAmount, cashAmount } = getPaymentDetail(row);
      const creditAmount = row.TotalAmount - (chequeAmount + cashAmount);
      
      return [
        row.SalesInvoice || 'N/A',
        row.SalesFlowRef || 'N/A',
        row.SalesInvoiceDate || 'N/A',
        fillterData.data?.Customer?.find(c => c._id === row.Client)?.SalesFlowRef || 'N/A',
        fillterData.data?.Customer?.find(c => c._id === row.Client)?.CutomerName || 'N/A',
        fillterData.data?.totalStore?.find(c => c._id === row.Store)?.StoreName || 'N/A',
        fillterData.data?.OrderBookerData?.find(ob => ob._id === row.OrderBooker)?.OrderBookerName || 'N/A',
        `Rs. ${fmt2(row.TotalAmount)}`,
        chequeNumber,
        `Rs. ${fmt2(chequeAmount)}`,
        `Rs. ${fmt2(cashAmount)}`,
        `Rs. ${fmt2(creditAmount)}`
      ];
    });

    // Add table to PDF
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Save PDF
    doc.save('Daily-Sales-Report.pdf');
  };

  // Export to Excel
  const exportToExcel = async () => {
    const worksheetData = data.map(row => {
      const { chequeNumber, chequeAmount, cashAmount } = getPaymentDetail(row);
      const creditAmount = row.TotalAmount - (chequeAmount + cashAmount);
      
      return {
        "Invoice No": row.SalesInvoice,
        "Sales Flow Ref": row.SalesFlowRef,
        "Invoice Date": row.SalesInvoiceDate,
        "Customer Code": fillterData.data?.Customer?.find(c => c._id === row.Client)?.SalesFlowRef || 'N/A',
        "Customer Name": fillterData.data?.Customer?.find(c => c._id === row.Client)?.CutomerName || 'N/A',
        "Store": fillterData.data?.totalStore?.find(c => c._id === row.Store)?.StoreName || 'N/A',
        "Order Booker": fillterData.data?.OrderBookerData?.find(ob => ob._id === row.OrderBooker)?.OrderBookerName || 'N/A',
        "Bill Amount": row.TotalAmount || 0,
        "Cheque No": chequeNumber,
        "Cheque Amount": chequeAmount,
        "Cash Amount": cashAmount,
        "Credit Amount": creditAmount
      };
    });

    const storeLabel = fillterData.data?.store?.length
      ? fillterData.data.totalStore
        ?.filter(s => String(fillterData.data.store).includes(String(s._id)))
        .map(s => s.StoreName)
        .join(", ") || "All"
      : "All";

    await exportProfessionalExcel({
      title: "Daily Sales Report",
      fileName: "Daily-Sales-Report",
      sheetName: "Sales Report",
      rows: worksheetData,
      meta: [
        `Period: ${fillterData.data?.startDate || ""} to ${fillterData.data?.endDate || ""}`,
        `Store: ${storeLabel}`,
      ],
    });
  };

  // Export to Word
  const exportToWord = async () => {
    // Create table rows for data
    const tableRows = data.map(row => {
      const { chequeNumber, chequeAmount, cashAmount } = getPaymentDetail(row);
      const creditAmount = row.TotalAmount - (chequeAmount + cashAmount);
      
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(row.SalesInvoice || 'N/A')] }),
          new TableCell({ children: [new Paragraph(row.SalesFlowRef || 'N/A')] }),
          new TableCell({ children: [new Paragraph(row.SalesInvoiceDate || 'N/A')] }),
          new TableCell({ children: [new Paragraph(fillterData.data?.Customer?.find(c => c._id === row.Client)?.SalesFlowRef || 'N/A')] }),
          new TableCell({ children: [new Paragraph(fillterData.data?.Customer?.find(c => c._id === row.Client)?.CutomerName || 'N/A')] }),
          new TableCell({ children: [new Paragraph(fillterData.data?.totalStore?.find(c => c._id === row.Store)?.StoreName || 'N/A')] }),
          new TableCell({ children: [new Paragraph(fillterData.data?.OrderBookerData?.find(ob => ob._id === row.OrderBooker)?.OrderBookerName || 'N/A')] }),
          new TableCell({ children: [new Paragraph(`Rs. ${fmt2(row.TotalAmount)}`)] }),
          new TableCell({ children: [new Paragraph(chequeNumber)] }),
          new TableCell({ children: [new Paragraph(`Rs. ${fmt2(chequeAmount)}`)] }),
          new TableCell({ children: [new Paragraph(`Rs. ${fmt2(cashAmount)}`)] }),
          new TableCell({ children: [new Paragraph(`Rs. ${fmt2(creditAmount)}`)] })
        ]
      });
    });

    // Create the document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Daily Sales Report",
                bold: true,
                size: 32
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: fillterData.data?.startDate && fillterData.data?.endDate 
                  ? `Date Range: ${fillterData.data.startDate} to ${fillterData.data.endDate}`
                  : "Sales Report",
                size: 24
              })
            ]
          }),
          new Paragraph({ text: "" }), // Empty line for spacing
          new Table({
            width: {
              size: 100,
              type: "pct"
            },
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Invoice No")] }),
                  new TableCell({ children: [new Paragraph("Sales Flow Ref")] }),
                  new TableCell({ children: [new Paragraph("Invoice Date")] }),
                  new TableCell({ children: [new Paragraph("Customer Code")] }),
                  new TableCell({ children: [new Paragraph("Customer Name")] }),
                  new TableCell({ children: [new Paragraph("Store")] }),
                  new TableCell({ children: [new Paragraph("Order Booker")] }),
                  new TableCell({ children: [new Paragraph("Bill Amount")] }),
                  new TableCell({ children: [new Paragraph("Cheque No")] }),
                  new TableCell({ children: [new Paragraph("Cheque Amount")] }),
                  new TableCell({ children: [new Paragraph("Cash Amount")] }),
                  new TableCell({ children: [new Paragraph("Credit Amount")] })
                ]
              }),
              ...tableRows
            ]
          })
        ]
      }]
    });

    // Generate and save the document
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Daily-Sales-Report.docx");
  };
  // Placeholder export/print handlers

  const handlePrint = () => window.print();


  return (
    <>
      <ReportPopupHeader title="Daily Sales Report" />

      {isLoading ? (
        <div className="loader-wrapper">
          <div className="spinner"></div>
          <style>
            {`.loader-wrapper {
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
        }`}
          </style>
        </div>

      ) : (<div>

        <div className="sales-report-container" ref={reportRef}>
          {/* ---- HEADER ---- */}
          <div className="table-container">
            <table className="sales-data-table">
              <thead className="bg-blue-200">
                <tr>
                  <th className="border border-gray-400 px-2 py-1">Invoice No</th>
                  <th className="border border-gray-400 px-2 py-1">Sales Flow Ref</th>
                  <th className="border border-gray-400 px-2 py-1">Invoice Date</th>
                  <th className="border border-gray-400 px-2 py-1">Customer Code</th>
                  <th className="border border-gray-400 px-2 py-1">Customer Name</th>
                  <th className="border border-gray-400 px-2 py-1">Department</th>
                  <th className="border border-gray-400 px-2 py-1">Order Booker</th>
                  <th className="border border-gray-400 px-2 py-1">Bill Amount</th>
                  <th className="border border-gray-400 px-2 py-1">Cheque No</th>
                  <th className="border border-gray-400 px-2 py-1">Cheque Amount</th>
                  <th className="border border-gray-400 px-2 py-1">Cash Amount</th>
                  <th className="border border-gray-400 px-2 py-1">Shortage</th>
                  <th className="border border-gray-400 px-2 py-1">Credit Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  // Extract cheque & cash details
                  let cheque = { number: "", amount: 0 };
                  let cash = 0;

                  const pd = getPaymentDetail(row);
                  cheque.number = pd.chequeNumber;
                  cheque.amount = pd.chequeAmount;
                  cash = pd.cashAmount;

                  const shortage = Number(row.Shortage) || 0;
                  const cashAfterShortage = cash - shortage;

                  return (
                    <tr key={i}>
                      <td className="border border-gray-400 px-2 py-1">
                        {row.SalesInvoice}
                      </td>
                      <td className="border border-gray-400 px-2 py-1">
                        {row.SalesFlowRef}
                      </td>
                      <td className="border border-gray-400 px-2 py-1">
                        {row.SalesInvoiceDate}
                      </td>
                      <td className="border border-gray-400 px-2 py-1">
                        {fillterData.data?.Customer.find(c => c._id === row.Client)?.SalesFlowRef || 'N/A'}
                      </td>
                      <td className="border border-gray-400 px-2 py-1">
                        {fillterData.data.Customer.find(c => c._id === row.Client)?.CutomerName || 'N/A'}
                      </td>
                      <td className="border border-gray-400 px-2 py-1">
                        {fillterData.data?.totalStore.find(c => c._id === row.Store)?.StoreName || 'N/A'}
                      </td>

                      <td className="border border-gray-400 px-2 py-1">
                        {fillterData.data?.OrderBookerData.find(ob => ob._id === row.OrderBooker)?.OrderBookerName || 'N/A'}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-right">
                        {fmt2(row.TotalAmount)}
                      </td>
                      <td className="border border-gray-400 px-2 py-1">
                        {cheque.number}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-right">
                        {fmt2(cheque.amount)}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-right">
                        {fmt2(cashAfterShortage)}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-right">
                        {fmt2(shortage)}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-right">
                        {fmt2(row.TotalAmount - (cheque.amount + cashAfterShortage + shortage))}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th className="border border-gray-400 px-2 py-1"></th>
                  <th className="border border-gray-400 px-2 py-1"></th>
                  <th className="border border-gray-400 px-2 py-1"></th>
                  <th className="border border-gray-400 px-2 py-1">Total</th>
                  <th className="border border-gray-400 px-2 py-1"></th>
                  <th className="border border-gray-400 px-2 py-1"></th>
                  <th className="border border-gray-400 px-2 py-1"></th>

                  {/* Total Amount */}
                  <th className="border border-gray-400 px-2 py-1 text-right">
                    {fmt2(data.reduce((sum, row) => sum + (row.TotalAmount || 0), 0))}
                  </th>

                  <th className="border border-gray-400 px-2 py-1"></th>

                  {/* Cheque Total */}
                  <th className="border border-gray-400 px-2 py-1 text-right">
                    {fmt2(data.reduce((sum, row) => sum + getLastCheque(row), 0))}
                  </th>

                  {/* Cash Total (after shortage) */}
                  <th className="border border-gray-400 px-2 py-1 text-right">
                    {fmt2(data.reduce((sum, row) => {
                      const cash = getLastCash(row);
                      const shortage = Number(row.Shortage) || 0;
                      return sum + (cash - shortage);
                    }, 0))}
                  </th>

                  {/* Shortage Total */}
                  <th className="border border-gray-400 px-2 py-1 text-right">
                    {fmt2(data.reduce((sum, row) => sum + (Number(row.Shortage) || 0), 0))}
                  </th>

                  {/* Balance Total */}
                  <th className="border border-gray-400 px-2 py-1 text-right">
                    {fmt2(data.reduce((sum, row) => {
                      const chequeAmt = getLastCheque(row);
                      const cashAmt = getLastCash(row);

                      const shortage = Number(row.Shortage) || 0;
                      const balance = (row.TotalAmount || 0) - (chequeAmt + cashAmt - shortage + shortage);
                      return sum + balance;
                    }, 0))}
                  </th>
                </tr>
              </tfoot>

            </table>
          </div>

          {/* ---- ACTIONS ---- */}
          <div className="report-actions">
            <button className="btn btn-word" onClick={exportToWord}>
              Export to Word
            </button>
            <button className="btn btn-excel" onClick={exportToExcel}>
              Export to Excel
            </button>
            <button className="btn btn-pdf" onClick={exportToPDF}>
              Export to PDF
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
        overflow-x: auto;
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
        margin-bottom: 20px;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 6px;
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
        {/* ---- SUMMARY SECTION ---- */}
        <div className="summary-section grid grid-cols-2 gap-6 mt-6">
          {/* Loadform Summary */}
          <div>
            <h3 className="bg-blue-600 text-white px-3 py-2 rounded-t font-semibold">
              Loadform Summary
            </h3>
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-blue-200 text-gray-900">
                  <th className="border px-2 py-1">Cash</th>
                  <th className="border px-2 py-1">Shortage</th>
                  <th className="border px-2 py-1">Credit</th>
                  <th className="border px-2 py-1">Cheque Collected</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1 text-right">
                    {fmt2(data.reduce((sum, row) => {
                      const cash = getLastCash(row);
                      const shortage = Number(row.Shortage) || 0;
                      return sum + (cash - shortage);
                    }, 0))}
                  </td>
                  <td className="border px-2 py-1 text-right">
                    {fmt2(data.reduce((sum, row) => sum + (Number(row.Shortage) || 0), 0))}
                  </td>
                  <td className="border px-2 py-1 text-right">
                    {fmt2(data.reduce((sum, row) => {
                      const chequeAmt = getLastCheque(row);
                      const cashAmt = getLastCash(row);
                      const shortage = Number(row.Shortage) || 0;
                      const balance = (row.TotalAmount || 0) - (chequeAmt + cashAmt - shortage + shortage);
                      return sum + balance;
                    }, 0))}
                  </td>
                  <td className="border px-2 py-1 text-right">
                    {fmt2(data.reduce((sum, row) => sum + getLastCheque(row), 0))}
                  </td>

                </tr>
              </tbody>
            </table>
          </div>

          {/* Sales Summary Calculation */}
          <div>
            <h3 className="bg-gray-300 px-3 py-2 rounded-t font-semibold">
              Sales Summary Calculation
            </h3>
            <table className="w-full border border-gray-300">
              <tbody>
                <tr>
                  <td className="border px-2 py-1">Gross Amount</td>
                  <td className="border px-2 py-1 text-right">
                    {fmt2(data.reduce((sum, row) => sum + (row.TotalAmount || 0), 0))}
                  </td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">Credit Sale</td>
                  <td className="border px-2 py-1 text-right">
                    {fmt2(data.reduce((sum, row) => {
                      const chequeAmt = getLastCheque(row);
                      const cashAmt = getLastCash(row);
                      const shortage = Number(row.Shortage) || 0;
                      const balance = (row.TotalAmount || 0) - (chequeAmt + cashAmt - shortage + shortage);
                      return sum + balance;
                    }, 0))}
                  </td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">Cheque Sale</td>
                  <td className="border px-2 py-1 text-right">
                    {fmt2(data.reduce((sum, row) => sum + getLastCheque(row), 0))}
                  </td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">Cash/Deposit Slip Collected</td>
                  <td className="border px-2 py-1 text-right">
                    {fmt2(data.reduce((sum, row) => {
                      const cash = getLastCash(row);
                      const shortage = Number(row.Shortage) || 0;
                      return sum + (cash - shortage);
                    }, 0))}
                  </td>
                </tr>
                <tr>
                  <td className="border px-2 py-1 font-bold">Shortage</td>
                  <td className="border px-2 py-1 text-right font-bold">
                    {fmt2(data.reduce((sum, row) => sum + (Number(row.Shortage) || 0), 0))}
                  </td>
                </tr>
                
              </tbody>
            </table>
          </div>


          <style jsx>{
            `
                    /* ---- SUMMARY SECTION ---- */
.summary-section {
margin: 40px;
  margin-top: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.summary-section h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.summary-section table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.summary-section th,
.summary-section td {
  border: 1px solid #e0e0e0;
  padding: 8px 12px;
}

.summary-section thead th {
  background: #f3f6fb;
  font-weight: 600;
  color: #2c3e50;
  text-align: center;
}

.summary-section tbody tr:nth-child(even) {
  background: #fafafa;
}

.summary-section td.text-right {
  text-align: right;
  font-family: 'Courier New', monospace;
}

.summary-section tr.bg-blue-100 {
  background: #eaf3ff !important;
  font-weight: 600;
  color: #2c3e50;
}

@media (max-width: 768px) {
  .summary-section {
    grid-template-columns: 1fr;
  }
}
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
`
          }

          </style>
        </div>
      </div>)}
    </>
  );
}

export default DailySalesReportPopup