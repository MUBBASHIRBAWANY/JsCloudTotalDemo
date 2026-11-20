import React, { useEffect, useState, useMemo, useRef } from 'react';
import { getDataFundtion } from '../../../Api/CurdFunctions';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";

const SundryCreditorBalancePopup = ({ filterData = [] }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { startDate, endDate } = filterData;
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([]);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);

  const getData = async () => {
    setIsLoading(true);
    try {
      const AccountCode = filterData.Customer?.map((item) => item.AccountCode) || [];
      const AccountsId = filterData.ChartofAccounts?.filter((item) =>
        AccountCode.includes(item.AccountCode)
      ).map((c) => c._id) || [];

      const gettingdata = await getDataFundtion(
        `GernalLager?startDate=${startDate}&endDate=${endDate}&Account=${AccountsId}`
      );

      // Process the data for general ledger
      const processedData = gettingdata.map((item) => ({
        ...item,
        Account: item.Account,
        VoucherNumber: item.VoucherNumber,
        VoucherDate: item.VoucherDate,
        Debit: parseFloat(item.Debit) || 0,
        Credit: parseFloat(item.Credit) || 0,
        Narration: item.Narration || '',
        Type: item.Type || 'Voucher',
        status: item.status || 'Post'
      }));

      setData(processedData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  console.log(filterData, "filterData.")

  useEffect(() => {
    getData();
  }, []);

  // Process data to group by account with requested format
  useEffect(() => {
    if (data && data.length > 0) {
      // Group transactions by account
      const accountGroups = data.reduce((acc, item) => {
        const accountId = item.Account;
        if (!acc[accountId]) {
          const accountInfo = filterData.ChartofAccounts?.find(acc => acc._id === accountId) || {};
          const Customer = filterData.Customer?.find((Cus) => Cus.AccountCode === accountInfo.AccountCode)

          acc[accountId] = {
            accountId,
            accountCode: accountInfo.AccountCode,
            accountName: accountInfo.AccountName || 'Unknown Account',
            orderbooker: filterData.OrderBooker.filter((ob) => ob.Region == Customer?.Region).map((obmap) => obmap.label).join(",") || "",
            region: Customer?.Region || "",
            city: Customer?.city || "",
            zone: Customer?.Zone || "",
            opening: 0, // Will be calculated separately
            totalDebit: 0,
            totalCredit: 0,
            netBalance: 0,
            transactions: [] // Store all transactions for calculation
          };
        }

        // Store transaction for later processing
        acc[accountId].transactions.push(item);

        return acc;
      }, {});

      // Calculate opening balance and period totals for each account
      Object.values(accountGroups).forEach(account => {
        let openingBalance = 0;
        let periodDebit = 0;
        let periodCredit = 0;

        // Process transactions to separate opening from period transactions
        account.transactions.forEach(transaction => {
          const isOpeningTransaction = transaction.Type === 'Opening';
          const isBeforePeriod = transaction.VoucherDate && new Date(transaction.VoucherDate) < new Date(startDate);
          const isVoucherBefore = transaction.Type === 'VoucherBefore';

          if (isOpeningTransaction || isBeforePeriod || isVoucherBefore) {
            // These transactions contribute to opening balance
            openingBalance += (transaction.Debit - transaction.Credit);
          } else {
            // These are within the reporting period
            periodDebit += transaction.Debit;
            periodCredit += transaction.Credit;
          }
        });

        // Update account with calculated values
        account.opening = openingBalance;
        account.totalDebit = periodDebit;
        account.totalCredit = periodCredit;
        account.netBalance = openingBalance + periodDebit - periodCredit;
      });

      // Convert to array for table display
      const processedRows = Object.values(accountGroups)
        .map(account => ({
          accountName: account.accountName,
          accountCode: account.accountCode,
          orderbooker: account.orderbooker,
          region: account.region,
          city: account.city,
          zone: account.zone,
          opening: account.opening,
          totalDebit: account.totalDebit,
          totalCredit: account.totalCredit,
          netBalance: account.netBalance
        }));

      // Apply filters based on filterData
      const thosedata = processedRows.filter((Reg) => {
        const orderbookerArr = Reg.orderbooker ? Reg.orderbooker.split(",") : [];

        return (
          (!filterData.Region || filterData.Region.length === 0 || filterData.Region.some((r) => r.value === Reg.region)) &&
          (!filterData.City || filterData.City.length === 0 || filterData.City.some((c) => c.value === Reg.city)) &&
          (!filterData.Zone || filterData.Zone.length === 0 || filterData.Zone.some((z) => z.value === Reg.zone)) &&
          (!filterData.OrderBooker || filterData.OrderBooker.length === 0 ||
            filterData.OrderBooker.some((ob) => orderbookerArr.includes(ob.label)))
        );
      }).map((da) => ({
        ...da,

        city: filterData.City.find((c) => c.value === da.city).label,
        region: filterData.Region.find((c) => c.value === da.region).label,
        zone: filterData.Zone.find((c) => c.value === da.zone).label,
      }));
      setRows(thosedata);
    }
  }, [data, filterData, startDate]);

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

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    return {
      totalOpening: rows.reduce((sum, account) => sum + (account.opening || 0), 0),
      totalDebit: rows.reduce((sum, account) => sum + account.totalDebit, 0),
      totalCredit: rows.reduce((sum, account) => sum + account.totalCredit, 0),
      netBalance: rows.reduce((sum, account) => sum + account.netBalance, 0)
    };
  }, [rows]);

  // Export functions
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredAndSortedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Debtors Balance Summary");
    XLSX.writeFile(workbook, "Debtors_Balance_Summary.xlsx");
  };

  const exportToWord = async () => {
    const tableRows = filteredAndSortedRows.map(row =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: row.accountCode || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.accountName || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.orderbooker || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.region || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.city || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.zone || '' })] }),
          new TableCell({ children: [new Paragraph({ text: (row.opening || 0)?.toLocaleString() })] }),
          new TableCell({ children: [new Paragraph({ text: row.totalDebit?.toLocaleString() || '0' })] }),
          new TableCell({ children: [new Paragraph({ text: row.totalCredit?.toLocaleString() || '0' })] }),
          new TableCell({ children: [new Paragraph({ text: row.netBalance?.toLocaleString() || '0' })] })
        ],
      })
    );

    const headers = ['Account', 'AccountName', 'Orderbooker', 'Region', 'City', 'Zone', 'OPENING', 'Total Debit', 'Total Credit', 'Net Balance'];
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
          new Paragraph({ text: "", heading: "Heading1" }),
          new Paragraph({ text: "Debtors Balance Summary" }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
          new Paragraph({ text: `Period: ${startDate} to ${endDate}` }),
          new Paragraph({ text: "" }),
          table,
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Debtors_Balance_Summary.docx");
  };

const exportToPDF = () => {
  const doc = new jsPDF("landscape");

  /* ------------------------------------------------------------------ */
  /* HEADER */
  /* ------------------------------------------------------------------ */
  doc.addImage(
    "https://res.cloudinary.com/dmi26itgk/image/upload/v1755944631/Screenshot_2025-08-23_152337_ajpexh.png",
    "PNG",
    250,
    8,
    50,
    20
  );
  doc.setFontSize(20);
  doc.text("Debtors Balance Summary", 14, 15);
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 29);

  /* ------------------------------------------------------------------ */
  /* TABLE DATA */
  /* ------------------------------------------------------------------ */
  const tableColumn = [
    "Account",
    "Account Name",
    "Orderbooker",
    "Region",
    "City",
    "Zone",
    "OPENING",
    "Total Debit",
    "Total Credit",
    "Net Balance"
  ];

  const tableRows = filteredAndSortedRows.map((row) => [
    row.accountCode || "",
    row.accountName || "",
    row.orderbooker || "",
    row.region || "",
    row.city || "",
    row.zone || "",
    (row.opening || 0)?.toLocaleString() || "0",
    row.totalDebit?.toLocaleString() || "0",
    row.totalCredit?.toLocaleString() || "0",
    row.netBalance?.toLocaleString() || "0"
  ]);

  // 1️⃣ Compute totals
  const totals = tableRows.reduce(
    (acc, row) => {
      acc.opening += Number(row[6].replace(/,/g, "")) || 0;
      acc.debit   += Number(row[7].replace(/,/g, "")) || 0;
      acc.credit  += Number(row[8].replace(/,/g, "")) || 0;
      acc.netBalance += Number(row[9].replace(/,/g, "")) || 0;
      return acc;
    },
    { opening: 0, debit: 0, credit: 0, netBalance: 0 }
  );

  // 2️⃣ Add the total row at the bottom
  const totalRow = [
    "Total", "", "", "", "", "", // first 6 columns empty
    totals.opening.toLocaleString(),
    totals.debit.toLocaleString(),
    totals.credit.toLocaleString(),
    totals.netBalance.toLocaleString()
  ];
  tableRows.push(totalRow);

  // 3️⃣ Render the table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },

    // Custom styling for the total row - FIXED VERSION
    didParseCell: (data) => {
      // Check if this is the total row (last row in body)
      if (data.section === 'body' && data.row.index === tableRows.length - 1) {
        data.cell.styles.fillColor = [255, 255, 204]; // Light yellow
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [0, 0, 0]; // Black text
        
        // Right align for numeric columns (columns 6-9)
        if (data.column.index >= 6) {
          data.cell.styles.halign = 'right';
        }
      }
    },

    headStyles: { 
      fillColor: [41, 128, 185], 
      textColor: 255,
      fontStyle: 'bold'
    },
    
    // Optional: Add alternate row colors for better readability
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    }
  });

  /* ------------------------------------------------------------------ */
  /* FOOTER */
  /* ------------------------------------------------------------------ */
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(10);
  doc.text(
    "Developed by JS International | / | ",
    doc.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: "center" }
  );

  /* ------------------------------------------------------------------ */
  /* WATERMARK */
  /* ------------------------------------------------------------------ */
  const img =
    "https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png";
  doc.setGState(new doc.GState({ opacity: 0.2 }));
  doc.addImage(img, "PNG", 70, 60, 160, 100);
  doc.setGState(new doc.GState({ opacity: 1 }));

  /* ------------------------------------------------------------------ */
  /* SAVE */
  /* ------------------------------------------------------------------ */
  doc.save("Debtors_Balance_Summary.pdf");
};

  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
      <html>
        <head>
          <title>Debtors Balance Summary</title>
          <style>
            body {
              font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
              background: #fff;
              color: #333;
              padding: 20px;
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
              font-size: 11px;
            }
            td {
              padding: 6px 4px;
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
            .positive-balance {
              color: #27ae60;
            }
            .negative-balance {
              color: #e74c3c;
            }
          </style>
        </head>
        <body>
          ${printContent}
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
    <div className="general-ledger-container" ref={reportRef}>
      <div className="watermark">
        <div className="watermark-content">
          <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png" alt="" />
        </div>
      </div>

      <div className="report-header">
        <div className="company-info">
          <h2 className="company-name"></h2>
          <p className="company-address">123 Business Avenue, Suite 456</p>
          <p className="company-contact"></p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Debtors Balance Summary</h1>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">Period: {startDate} to {endDate}</p>
        </div>
      </div>

      <div className="report-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search accounts..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="summary-stats">
          <span className="stat-item">
            Total OPENING: <strong>{grandTotals.totalOpening.toLocaleString()}</strong>
          </span>
          <span className="stat-item">
            Total Debit: <strong>{grandTotals.totalDebit.toLocaleString()}</strong>
          </span>
          <span className="stat-item">
            Total Credit: <strong>{grandTotals.totalCredit.toLocaleString()}</strong>
          </span>
          <span className="stat-item">
            Net Balance: <strong className={grandTotals.netBalance >= 0 ? 'positive-balance' : 'negative-balance'}>
              {grandTotals.netBalance.toLocaleString()}
            </strong>
          </span>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
          </div>
        ) : (
          <table className="ledger-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('accountCode')}>
                  Account Code {sortConfig.key === 'accountCode' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('accountName')}>
                  Account {sortConfig.key === 'accountName' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('orderbooker')}>
                  Orderbooker {sortConfig.key === 'orderbooker' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('region')}>
                  Region {sortConfig.key === 'region' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('city')}>
                  City {sortConfig.key === 'city' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('zone')}>
                  Zone {sortConfig.key === 'zone' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('opening')}>
                  OPENING {sortConfig.key === 'opening' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('totalDebit')}>
                  Total Debit {sortConfig.key === 'totalDebit' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('totalCredit')}>
                  Total Credit {sortConfig.key === 'totalCredit' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('netBalance')}>
                  Net Balance {sortConfig.key === 'netBalance' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length > 0 ? (
                filteredAndSortedRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.accountCode}</strong>
                    </td>
                    <td>
                      <strong>{row.accountName}</strong>
                    </td>
                    <td>{row.orderbooker || ""}</td>
                    <td>{row.region || ""}</td>
                    <td>{row.city || ""}</td>
                    <td>{row.zone || ""}</td>
                    <td className="numeric">{row.opening?.toLocaleString() || "0"}</td>
                    <td className="numeric">{row.totalDebit.toLocaleString()}</td>
                    <td className="numeric">{row.totalCredit.toLocaleString()}</td>
                    <td className={`numeric ${row.netBalance >= 0 ? 'positive-balance' : 'negative-balance'}`}>
                      <strong>{row.netBalance.toLocaleString()}</strong>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="no-data">
                    No account balance data found
                  </td>
                </tr>
              )}
              {/* Grand Total Row */}
              <tr className="grand-total-row">
                <td colSpan="6" className="footer-total">
                  <strong>Grand Total</strong>
                </td>
                <td className="numeric footer-total">
                  <strong>{grandTotals.totalOpening.toLocaleString()}</strong>
                </td>
                <td className="numeric footer-total">
                  <strong>{grandTotals.totalDebit.toLocaleString()}</strong>
                </td>
                <td className="numeric footer-total">
                  <strong>{grandTotals.totalCredit.toLocaleString()}</strong>
                </td>
                <td className={`numeric footer-total ${grandTotals.netBalance >= 0 ? 'positive-balance' : 'negative-balance'}`}>
                  <strong>{grandTotals.netBalance.toLocaleString()}</strong>
                </td>
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
        .general-ledger-container {
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
        
        .transaction-row:hover {
          background-color: #f8f9fa;
        }
        
        .grand-total-row {
          background: #34495e !important;
          color: white;
        }
        
        .grand-total-row td {
          background: #34495e !important;
          color: white;
          border-top: 2px solid #2c3e50;
        }
        
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eaeaea;
          position: relative;
          z-index: 2;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: 700;
          color: #2c3e50;
          margin: 0 0 8px 0;
        }
        
        .report-title {
          font-size: 20px;
          font-weight: 600;
          color: #3498db;
          margin: 0 0 8px 0;
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
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .stat-item {
          font-size: 12px;
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
        }
        
        .ledger-table {
          min-width: 1200px;
          border-collapse: collapse;
          font-size: 12px;
          width: 100%;
        }
        
        .ledger-table th {
          background: #f8f9fa;
          padding: 10px 6px;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
          border-bottom: 2px solid #e0e0e0;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
          font-size: 11px;
        }
        
        .ledger-table td {
          padding: 8px 4px;
          border-bottom: 1px solid #eaeaea;
          font-size: 11px;
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
        }
        
        .positive-balance {
          color: #27ae60;
        }
        
        .negative-balance {
          color: #e74c3c;
        }
        
        .report-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          position: relative;
          z-index: 2;
        }
        
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-word { background: #2b579a; color: white; }
        .btn-excel { background: #217346; color: white; }
        .btn-pdf { background: #f40f02; color: white; }
        .btn-print { background: #555; color: white; }
        
        .btn:hover {
          opacity: 0.9;
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
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 1200px) {
          .report-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
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
        }
        
        @media print {
          .report-controls, .report-actions {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default SundryCreditorBalancePopup;