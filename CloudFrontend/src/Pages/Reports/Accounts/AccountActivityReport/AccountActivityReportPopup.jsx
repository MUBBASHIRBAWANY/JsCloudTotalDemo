import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
import autoTable from 'jspdf-autotable';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AccountActivityReportPopup = ({ data }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [rows, setRows] = useState([]);

  const getData = async () => {
    try {
      setIsLoading(true);

      const allAccountsRes = await getDataFundtion("/ChartofAccounts");
      const allAccounts = allAccountsRes.data || allAccountsRes || [];

      let filteredAccounts = allAccounts;

      // Filter by stage
      if (data.stage && data.stage !== 'StageAll') {
        const stageNum = data.stage.replace('Stage', '');
        filteredAccounts = filteredAccounts.filter(acc => String(acc.Stage) === stageNum);
      }

      // Filter by from/to account range
      const fromCode = data.fromAccount || '';
      const toCode = data.toAccount || '';
      if (fromCode || toCode) {
        filteredAccounts = filteredAccounts.filter(acc => {
          const code = acc.AccountCode || '';
          if (fromCode && toCode) {
            const prefixLen = Math.min(fromCode.length, toCode.length, code.length);
            const codePrefix = code.substring(0, prefixLen);
            return codePrefix >= fromCode.substring(0, prefixLen) && codePrefix <= toCode.substring(0, prefixLen);
          } else if (fromCode) {
            const prefixLen = Math.min(fromCode.length, code.length);
            return code.substring(0, prefixLen) >= fromCode.substring(0, prefixLen);
          } else if (toCode) {
            const prefixLen = Math.min(toCode.length, code.length);
            return code.substring(0, prefixLen) <= toCode.substring(0, prefixLen);
          }
          return true;
        });
      }

      const accountLookup = {};
      filteredAccounts.forEach(acc => {
        const id = acc._id || acc.id;
        if (id) {
          accountLookup[id] = {
            name: acc.AccountName || '',
            code: acc.AccountCode || '',
            Stage: acc.Stage || ''
          };
        }
      });

      const accountIdsStr = Object.keys(accountLookup).join(',');
      if (!accountIdsStr) {
        setRows([]);
        setIsLoading(false);
        return;
      }

      const ledgerData = await getDataFundtion(
        `GernalLager?startDate=${data.startDate}&endDate=${data.endDate}&Account=${accountIdsStr}&Store=`
      );
      const dataArray = Array.isArray(ledgerData) ? ledgerData : [];

      // Group by account - only current period activity (skip VoucherBefore/opening entries)
      const accountTotals = {};

      dataArray.forEach(item => {
        const accountId = item.Account;
        if (!accountId || !accountLookup[accountId]) return;

        // Skip opening/VoucherBefore entries - only current period activity
        if (item.Type === "VoucherBefore") return;

        const debit = Number(item.Debit) || 0;
        const credit = Number(item.Credit) || 0;

        if (!accountTotals[accountId]) {
          accountTotals[accountId] = { totalDebit: 0, totalCredit: 0 };
        }
        accountTotals[accountId].totalDebit += debit;
        accountTotals[accountId].totalCredit += credit;
      });

      // Build result array
      const result = [];
      Object.keys(accountTotals).forEach(accountId => {
        const totals = accountTotals[accountId];
        const accountInfo = accountLookup[accountId];

        // Only include accounts with activity
        if (totals.totalDebit === 0 && totals.totalCredit === 0) return;

        const balance = totals.totalDebit - totals.totalCredit;

        result.push({
          _id: accountId,
          code: accountInfo.code,
          AccountName: accountInfo.name,
          Debit: totals.totalDebit,
          Credit: totals.totalCredit,
          Balance: Number(balance.toFixed(2))
        });
      });

      // Sort by account code
      result.sort((a, b) => {
        const numA = parseFloat(a.code) || 0;
        const numB = parseFloat(b.code) || 0;
        return numA - numB;
      });

      setRows(result);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching account activity data:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  // ================= Totals =================
  const totalDebit = rows.reduce((s, r) => s + r.Debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.Credit, 0);
  const totalBalance = rows.reduce((s, r) => s + r.Balance, 0);

  // ================= Excel Export =================
  const downloadExcel = async () => {
    setIsExporting(true);
    try {
      const exportData = rows.map((row, index) => ({
        '#': index + 1,
        'Account No': row.code,
        'Account Name': row.AccountName,
        'Debit': row.Debit,
        'Credit': row.Credit,
        'Balance': row.Balance
      }));

      exportData.push({
        '#': '',
        'Account No': '',
        'Account Name': 'TOTAL',
        'Debit': totalDebit,
        'Credit': totalCredit,
        'Balance': totalBalance
      });

      await exportProfessionalExcel({
        title: 'Account Activity Report',
        fileName: 'Account_Activity_Report',
        sheetName: 'Account Activity',
        rows: exportData,
        meta: [
          `Period: ${data.startDate} to ${data.endDate}`,
          data.fromAccount ? `From Account: ${data.fromAccount}` : '',
          data.toAccount ? `To Account: ${data.toAccount}` : '',
          'Current period activity only (no opening balance)',
        ].filter(Boolean),
        excludeKeys: ['_id', 'id'],
      });
    } catch (error) {
      console.error("Export to Excel failed:", error);
      alert("Failed to export to Excel. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // ================= PDF Export =================
  const downloadPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(16);
      doc.text("Account Activity Report", pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Period: ${data.startDate} to ${data.endDate}`, 14, 22);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

      const summaryHead = [['#', 'Account No', 'Account Name', 'Debit', 'Credit', 'Balance']];
      const summaryBody = rows.map((row, index) => [
        index + 1,
        row.code,
        row.AccountName,
        fmt(row.Debit),
        fmt(row.Credit),
        fmt(row.Balance)
      ]);
      const summaryFoot = [[
        '', '', 'TOTAL',
        fmt(totalDebit),
        fmt(totalCredit),
        fmt(totalBalance)
      ]];

      autoTable(doc, {
        head: summaryHead,
        body: summaryBody,
        foot: summaryFoot,
        startY: 34,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [66, 139, 202], fontSize: 8 },
        footStyles: { fillColor: [44, 62, 80], fontStyle: 'bold', fontSize: 8 },
        margin: { top: 30 },
        didDrawPage: function (pageData) {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.text(
            `Page ${pageData.pageNumber} of ${pageCount}`,
            pageWidth - 20,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'right' }
          );
        },
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      doc.save(`Account_Activity_Report_${timestamp}.pdf`);
    } catch (error) {
      console.error("Export to PDF failed:", error);
      alert("Failed to export to PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // ================= Print =================
  const handlePrint = () => {
    const printContent = document.getElementById('account-activity-report');
    if (!printContent) {
      alert("Report content not found.");
      return;
    }
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>Account Activity Report</title>
          <style>
            body { font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th, td { padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; }
            th { background: #f8f9fa; font-weight: 600; }
            .num { text-align: right; font-family: 'Courier New', monospace; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div style={styles.container} id="account-activity-report">
      <ReportPopupHeader title="Account Activity Report" />

      {isExporting && (
        <div style={styles.exportLoader}>
          <div style={styles.exportLoaderContent}>
            <div style={styles.spinner}></div>
            <p>Exporting data...</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div style={styles.loader}>
          <div style={styles.spinner}></div>
          <p>Loading data...</p>
        </div>
      )}

      <div style={styles.salesReportHeader}>
        <div style={styles.companyInfo}>
          <div style={styles.companyName}>Pearl Dynamic</div>
          <div style={styles.companyAddress}>123 Business Avenue, City, Country</div>
          <div style={styles.companyContact}>contact@faedibles.com | +1 (234) 567-8901</div>
        </div>

        <div style={styles.reportInfo}>
          <div style={styles.reportTitle}>Account Activity Report</div>
          <div style={styles.reportDate}>Generated: {new Date().toLocaleDateString()}</div>
          <div style={styles.reportRange}>Period: {data.startDate} to {data.endDate}</div>
          <div style={styles.reportNote}>Current period activity only (no opening balance)</div>
        </div>
      </div>

      <div style={styles.reportControls}>
        <div style={styles.summaryStats}>
          <div style={styles.statItem}>Accounts: {rows.length}</div>
          <div style={styles.statItem}>Total Debit: {fmt(totalDebit)}</div>
          <div style={styles.statItem}>Total Credit: {fmt(totalCredit)}</div>
        </div>
      </div>

      <div style={styles.exportButtons}>
        <button onClick={downloadExcel} style={styles.exportButton} disabled={isExporting || rows.length === 0}>
          {isExporting ? 'Exporting...' : 'Export to Excel'}
        </button>
        <button onClick={downloadPDF} style={styles.exportButton} disabled={isExporting || rows.length === 0}>
          {isExporting ? 'Exporting...' : 'Export to PDF'}
        </button>
        <button onClick={handlePrint} style={styles.exportButton} disabled={isExporting || rows.length === 0}>
          Print Report
        </button>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.salesDataTable}>
          <thead>
            <tr>
              <th style={{ ...styles.tableHeader, width: '50px', textAlign: 'center', borderLeft: '1px solid #cbd5e1' }}>#</th>
              <th style={{ ...styles.tableHeader, minWidth: '90px' }}>Account No</th>
              <th style={{ ...styles.tableHeader, minWidth: '180px' }}>Account Name</th>
              <th style={styles.tableHeader}>Debit</th>
              <th style={styles.tableHeader}>Credit</th>
              <th style={{ ...styles.tableHeader, borderRight: 'none' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((item, index) => (
                <tr key={item._id} style={{ ...styles.tableRow, backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                  <td style={{ ...styles.tableCell, textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>{index + 1}</td>
                  <td style={{ ...styles.tableCell, fontFamily: "'Courier New', monospace" }}>{item.code}</td>
                  <td style={styles.tableCell}>{item.AccountName}</td>
                  <td style={{ ...styles.tableCell, ...styles.amount }}>{fmt(item.Debit)}</td>
                  <td style={{ ...styles.tableCell, ...styles.amount }}>{fmt(item.Credit)}</td>
                  <td style={{ ...styles.tableCell, ...styles.amount, borderRight: 'none', fontWeight: 'bold' }}>{fmt(item.Balance)}</td>
                </tr>
              ))
            ) : (
              !isLoading && (
                <tr>
                  <td colSpan={6} style={{ ...styles.tableCell, ...styles.noData, borderLeft: '1px solid #e2e8f0', borderRight: 'none' }}>
                    No account activity data available for the selected period
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div style={styles.totalsFooter}>
          <div style={styles.totalsContainer}>
            <div style={styles.totalItem}>
              <span style={styles.totalLabel}>Total Debit</span>
              <span style={styles.totalValue}>{fmt(totalDebit)}</span>
            </div>
            <div style={styles.totalItem}>
              <span style={styles.totalLabel}>Total Credit</span>
              <span style={styles.totalValue}>{fmt(totalCredit)}</span>
            </div>
            <div style={{ ...styles.totalItem, color: totalBalance === 0 ? '#27ae60' : '#e74c3c' }}>
              <span style={styles.totalLabel}>Net Activity</span>
              <span style={styles.totalValue}>{fmt(totalBalance)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    fontFamily: "'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif",
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    padding: '24px',
    margin: '20px auto',
    maxWidth: '1400px',
    color: '#333',
    position: 'relative',
    overflow: 'scroll',
  },
  loader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    flexDirection: 'column',
    color: 'white',
  },
  exportLoader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
  },
  exportLoaderContent: {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    textAlign: 'center',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    width: '48px',
    height: '48px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 15px',
  },
  totalsFooter: {
    background: '#2c3e50',
    color: 'white',
    borderRadius: '6px',
    padding: '16px 20px',
    marginTop: '10px',
  },
  totalsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
  },
  totalItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  totalLabel: {
    fontSize: '12px',
    opacity: 0.9,
    marginBottom: '4px',
  },
  totalValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    fontFamily: "'Courier New', monospace",
  },
  salesReportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: '1px solid #eaeaea',
  },
  companyInfo: { textAlign: 'left' },
  companyName: { fontSize: '24px', fontWeight: '700', color: '#2c3e50', margin: '0 0 8px 0' },
  companyAddress: { fontSize: '12px', color: '#7f8c8d', margin: '4px 0' },
  companyContact: { fontSize: '12px', color: '#7f8c8d', margin: '4px 0' },
  reportInfo: { textAlign: 'right' },
  reportTitle: { fontSize: '20px', fontWeight: '600', color: '#3498db', margin: '0 0 8px 0' },
  reportDate: { fontSize: '12px', color: '#7f8c8d', margin: '4px 0' },
  reportRange: { fontSize: '12px', color: '#7f8c8d', margin: '4px 0' },
  reportNote: { fontSize: '11px', color: '#e74c3c', margin: '4px 0', fontStyle: 'italic' },
  reportControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  summaryStats: { display: 'flex', gap: '24px' },
  statItem: { fontSize: '14px', color: '#555', padding: '8px 16px', background: '#f8f9fa', borderRadius: '4px', fontWeight: '600' },
  exportButtons: { display: 'flex', gap: '10px', padding: '10px 0', flexWrap: 'wrap', marginBottom: '16px' },
  exportButton: { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', minWidth: '120px' },
  tableContainer: { overflowX: 'auto', overflowY: 'hidden', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '20px', WebkitOverflowScrolling: 'touch', minHeight: '120px' },
  salesDataTable: { minWidth: '800px', borderCollapse: 'collapse', fontSize: '12px', width: '100%' },
  tableHeader: { background: '#f1f5f9', padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#1e293b', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #cbd5e1', whiteSpace: 'nowrap', position: 'sticky', top: 0 },
  tableRow: { borderBottom: '1px solid #e2e8f0' },
  tableCell: { padding: '8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' },
  amount: { textAlign: 'right', fontFamily: "'Courier New', monospace" },
  noData: { textAlign: 'center', padding: '30px', color: '#95a5a6', fontStyle: 'italic' },
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default AccountActivityReportPopup;
