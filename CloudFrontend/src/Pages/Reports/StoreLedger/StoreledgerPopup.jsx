import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';


const StoreledgerPopup = ({ filterData = [] }) => {
    //console.log("Filter Data:", filterData);

    const [isLoading, setIsLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [filter, setFilter] = useState('');
    const [data, setData] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const reportRef = useRef(null);

    // Format date function
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).replace(",", "");
    };

    // Extract client name from narration
    const extractClientNameFromNarration = (narration) => {
        if (!narration) return "";
        // Extract name after "from" in the narration
        const match = narration.match(/from\s+(.+)$/);
        return match ? match[1].trim() : narration;
    };

    // Extract invoice number from narration
    const extractInvoiceFromNarration = (narration) => {
        if (!narration) return "";
        const match = narration.match(/invoice\s+(\d+)/i);
        return match ? match[1] : "";
    };

    const getData = async () => {
        setIsLoading(true);
        try {
            // Store filter on server — no full SalesInvoice dump needed (backend enriches)
            const storeIds = Array.isArray(filterData.Store)
                ? filterData.Store.map((s) => s?.value).filter(Boolean).join(",")
                : "";
            const qs = new URLSearchParams({
                startDate: filterData.startDate || "",
                endDate: filterData.endDate || "",
            });
            if (storeIds) qs.set("Store", storeIds);

            const ledgerData = await getDataFundtion(
                `GernalLager/StoreLeadger?${qs.toString()}`
            );
            setData(Array.isArray(ledgerData) ? ledgerData : []);
        } catch (err) {
            console.error("Store ledger fetch failed:", err);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }

    // Process data on component mount
    useEffect(() => {
        if (data && data.length > 0) {
            const processed = data.map((item, index) => {
                const clientName = filterData.Customer.find((cus) => cus.value == item.Client);

                return {
                    id: index + 1,
                    voucherNumber: item?.VoucherNumber,
                    voucherDate: formatDate(item?.VoucherDate),
                    clientId: clientName?.value,
                    clientName: clientName?.name,
                    clientRef: clientName?.SalesFlowRef,
                    invoiceNumber: item?.SalesInvoice || item?.SaleInvoice || item?.ClientRef2,
                    SalesFLowInv: item?.SalesFlowRef || item?.ClientRef2,
                    narration: item?.Narration,
                    creditAmount: Number(item?.Credit) || 0,
                    debitAmount: Number(item?.Debit) || 0,
                    voucherType: item?.VoucherType,
                    invoiceDate: formatDate(item?.SalesInvoiceDate || ""),
                    type: item.Type,
                    store: item?.storeName || item?.store || "0",
                    // For summary calculations
                    netAmount: (Number(item.Credit) || 0) - (Number(item.Debit) || 0)
                };
            });

            // Backend already sorted; keep stable client-side sort as safety
            const sortedData = processed.sort((a, b) => {
                const dateA = new Date(a.voucherDate.split('-').reverse().join('-'));
                const dateB = new Date(b.voucherDate.split('-').reverse().join('-'));
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA - dateB;
                }
                return String(a.voucherNumber || "").localeCompare(String(b.voucherNumber || ""));
            });
            setRows(sortedData);
        } else {
            setRows([]);
        }
    }, [data]);

    // Initialize with sample data
    useEffect(() => {


        getData()
        // You can replace this with actual API call
        // const fetchData = async () => {
        //   try {
        //     const response = await getDataFunction('/your-endpoint');
        //     setData(response.data);
        //   } catch (error) {
        //     console.error('Error fetching data:', error);
        //   } finally {
        //     setIsLoading(false);
        //   }
        // };

        // For now, using sample data

    }, []);

    // Filter and sort rows
    const filteredAndSortedRows = useMemo(() => {
        let filtered = rows;

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

    // Request sort function
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Calculate totals
    const totals = useMemo(() => {
        return {
            totalCredit: filteredAndSortedRows.reduce((sum, row) => sum + row.creditAmount, 0),
            totalDebit: filteredAndSortedRows.reduce((sum, row) => sum + row.debitAmount, 0),
            netAmount: filteredAndSortedRows.reduce((sum, row) => sum + row.netAmount, 0),
            totalRecords: filteredAndSortedRows.length
        };
    }, [filteredAndSortedRows]);

    // Export to Excel
    const exportToExcel = async () => {
        const exportRows = filteredAndSortedRows.map((row, index) => ({
            '#': index + 1,
            ...row,
            creditAmount: Number(Number(row.creditAmount || 0).toFixed(2)),
            debitAmount: Number(Number(row.debitAmount || 0).toFixed(2)),
            netAmount: Number(Number(row.netAmount || 0).toFixed(2)),
        }));
        await exportProfessionalExcel({
            title: 'Store Ledger',
            fileName: 'Cash_Receipts_Report',
            sheetName: 'Cash Receipts Report',
            rows: exportRows,
            meta: [
                filterData.startDate && filterData.endDate
                    ? `Period: ${filterData.startDate} to ${filterData.endDate}`
                    : '',
                Array.isArray(filterData.Store) && filterData.Store[0]?.label
                    ? `Store: ${filterData.Store[0].label}`
                    : '',
            ].filter(Boolean),
            excludeKeys: ['_id', 'id'],
        });
    };

    // Export to Word
    const exportToWord = async () => {
        if (filteredAndSortedRows.length === 0) return;

        const headers = Object.keys(filteredAndSortedRows[0]);
        const tableRows = filteredAndSortedRows.map(row =>
            new TableRow({
                children: Object.values(row).map(value =>
                    new TableCell({
                        children: [new Paragraph({ text: String(value) })],
                    })
                ),
            })
        );

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
                    new Paragraph({ text: "Cash Receipts Report", heading: "Heading1" }),
                    new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
                    new Paragraph({ text: "" }),
                    table,
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, "Cash_Receipts_Report.docx");
    };

    // Export to PDF
    const exportToPDF = () => {
        const doc = new jsPDF("landscape");
        const watermark = "https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png";

        // Header
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFontSize(20);
        doc.text("Cash Receipts Report", pageWidth / 2, 15, { align: "center" });
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
        doc.text(`Total Records: ${totals.totalRecords}`, 14, 32);

        // Table columns
        const tableColumn = [
            "S.No",
            "Voucher No",
            "Voucher Date",
            "Client Ref",
            "Client Name",
            "Invoice No",
            "Narration",
            "Credit Amount",
            "Debit Amount",
            "Voucher Type",
            "Store"
        ];

        // Table rows
        const tableRows = filteredAndSortedRows.map(row => [
            row.id,
            row.voucherNumber,
            row.voucherDate,
            row.clientRef,
            row.clientName,
            row.invoiceNumber,
            row?.narration?.length > 50 ? row.narration.substring(0, 50) + "..." : row.narration,
            row.creditAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            row.debitAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            row.voucherType,
            row.store
        ]);

        // Totals row
        const totalsRow = new Array(tableColumn.length).fill("");
        totalsRow[0] = "Totals";
        totalsRow[7] = totals.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        totalsRow[8] = totals.totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        totalsRow[tableColumn.length - 1] = `Net: ${totals.netAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        tableRows.push(totalsRow);

        // AutoTable
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
            },
            didParseCell: function (data) {
                const lastRowIndex = tableRows.length - 1;
                if (data.row.index === lastRowIndex) {
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.fillColor = [230, 230, 230];
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
                    "Developed by JS International | Website: https://jaffersons.com/ | Contact: 0301-8251291",
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: "center" }
                );
            },
        });

        // Summary section
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text("Summary", pageWidth / 2, finalY, { align: "center" });

        const summaryData = [
            ["Total Credit Amount", totals.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
            ["Total Debit Amount", totals.totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
            ["Net Amount", totals.netAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
            ["Total Records", totals.totalRecords.toString()]
        ];

        autoTable(doc, {
            startY: finalY + 5,
            head: [["Description", "Amount"]],
            body: summaryData,
            theme: "grid",
            styles: { fontSize: 10 },
            headStyles: { fillColor: [41, 128, 185] },
            bodyStyles: { halign: "right" },
        });

        doc.save("Cash_Receipts_Report.pdf");
    };

    // Print function
    const handlePrint = () => {
        const printContent = reportRef.current.innerHTML;
        const printWindow = window.open("", "_blank", "width=1200,height=800");

        printWindow.document.write(`
      <html>
        <head>
          <title>Cash Receipts Report</title>
          <style>
            body {
              font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
              background: #fff;
              color: #333;
              padding: 20px;
            }
            .report-header {
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
              font-size: 12px;
            }
            th {
              background: #f8f9fa;
              padding: 8px 6px;
              text-align: left;
              font-weight: 600;
              color: #2c3e50;
              border-bottom: 2px solid #e0e0e0;
            }
            td {
              padding: 6px;
              border-bottom: 1px solid #eaeaea;
              font-size: 11px;
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
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    return (
    <div className="sales-report-container" ref={reportRef}>
      <ReportPopupHeader title="Store Ledger" />

            <div className="watermark">
                <div className="watermark-content">
                    <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png" alt="" />
                </div>
            </div>

            <div className="sales-report-header">
                <div className="company-info">
                    <h2 className="company-name">Cash Receipts Report</h2>
                    <p className="company-address">Voucher Transactions</p>
                </div>
                <div className="report-info">
                    <h1 className="report-title">Cash Receipts</h1>
                    <p className="report-date">Generated: {new Date().toLocaleString()}</p>
                    <p className="report-range">
                        Showing {filteredAndSortedRows.length} of {rows.length} records
                    </p>
                </div>
            </div>

            <div className="report-controls">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search vouchers..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="summary-stats">
                    <span className="stat-item">
                        Total Credit: <strong>{totals.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </span>
                    <span className="stat-item">
                        Total Debit: <strong>{totals.totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </span>
                    <span className="stat-item">
                        Net Amount: <strong>{totals.netAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </span>
                    <span className="stat-item">
                        Records: <strong>{totals.totalRecords}</strong>
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
                                <th onClick={() => requestSort('voucherNumber')}>Voucher No {sortConfig.key === 'voucherNumber' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('voucherDate')}>Date {sortConfig.key === 'voucherDate' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('clientRef')}>Client Ref {sortConfig.key === 'clientRef' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('clientName')}>Client Name {sortConfig.key === 'clientName' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('invoiceNumber')}>Invoice No {sortConfig.key === 'invoiceNumber' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('invoiceDate')}>Invoice Date {sortConfig.key === 'invoiceDate' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('SalesFlowRef')}>SalesFlowRef {sortConfig.key === 'SalesFlowRef' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('narration')}>Narration {sortConfig.key === 'narration' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('creditAmount')}>Received Amount {sortConfig.key === 'creditAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('voucherType')}>Type {sortConfig.key === 'voucherType' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('store')}>Store {sortConfig.key === 'store' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedRows.length > 0 ? (
                                filteredAndSortedRows.map((row) => (
                                    <tr key={row.id}>
                                        <td>{row.id}</td>
                                        <td style={{ minWidth: "100px" }}>{row.voucherNumber}</td>
                                        <td>{row.voucherDate}</td>
                                        <td>{row.clientRef}</td>
                                        <td style={{ minWidth: "150px" }}>{row.clientName}</td>
                                        <td>{row.invoiceNumber}</td>
                                        <td>{row.invoiceDate}</td>
                                        <td>{row.SalesFLowInv}</td>
                                        <td style={{ minWidth: "200px", maxWidth: "300px" }} title={row.narration}>
                                            {row?.narration?.length > 50 ? row.narration.substring(0, 50) + "..." : row.narration}
                                        </td>
                                        <td className='numeric'>{row.creditAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td>{row.voucherType}</td>
                                        <td>{row.store}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="11" className="no-data">
                                        No matching records found
                                    </td>
                                </tr>
                            )}
                            <tr>
                                <td className="footer-total">Totals</td>
                                <td className="numeric footer-total"></td>
                                <td className="numeric footer-total"></td>
                                <td className="numeric footer-total"></td>
                                <td className="numeric footer-total"></td>
                                <td className="numeric footer-total"></td>
                                <td className="numeric footer-total"></td>
                                <td className="numeric footer-total"></td>
                                <td className="numeric footer-total"></td>
                                <td className="numeric footer-total">{totals.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="numeric footer-total"></td>
                                <td className="numeric footer-total"></td>
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
          max-width: 1600px;
          color: #333;
          position: relative;
          overflow: auto;
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
        
        .watermark-content img {
          max-width: 300px;
          max-height: 300px;
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
        
        .company-address {
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
          flex-wrap: wrap;
        }
        
        .stat-item {
          font-size: 14px;
          color: #555;
          background: #f8f9fa;
          padding: 8px 12px;
          border-radius: 4px;
          border: 1px solid #eaeaea;
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
          min-width: 1400px;
          border-collapse: collapse;
          font-size: 12px;
          width: 100%;
        }
        
        .sales-data-table th {
          background: #f8f9fa;
          padding: 12px 6px;
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
          padding: 8px 6px;
          border-bottom: 1px solid #eaeaea;
          font-size: 11px;
        }
        
        .sales-data-table tbody tr:hover {
          background-color: #f8f9fa;
        }
        
        .numeric {
          text-align: right;
        }
        
        .no-data {
          text-align: center;
          padding: 30px;
          color: #95a5a6;
          font-style: italic;
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

export default StoreledgerPopup;