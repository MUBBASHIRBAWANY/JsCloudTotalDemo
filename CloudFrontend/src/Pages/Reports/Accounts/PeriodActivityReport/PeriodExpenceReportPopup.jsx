import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
import autoTable from 'jspdf-autotable';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';

const MONTH_LABELS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

// Convert calendar month index (0=Jan) to fiscal year index (0=Jul)
const toFiscalMonth = (calMonth) => (calMonth - 6 + 12) % 12;

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PeriodExpenceReportPopup = ({ data }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // storeGroups: [{ storeName, accounts: [{ code, accountName, Months[], Total }] }]
  const [storeGroups, setStoreGroups] = useState([]);

  const getData = async () => {
    try {
      setIsLoading(true);

      // Fetch all accounts and filter only 5xxx (expense) accounts
      const allAccountsRes = await getDataFundtion("/ChartofAccounts");
      const allAccounts = allAccountsRes.data || allAccountsRes || [];

      // Only accounts starting with "5" (expense accounts)
      const filteredAccounts = allAccounts.filter(acc => {
        const code = acc.AccountCode || '';
        return code.startsWith('5');
      });

      const accountLookup = {};
      filteredAccounts.forEach(acc => {
        const id = acc._id || acc.id;
        if (id) {
          accountLookup[id] = {
            name: acc.AccountName || '',
            code: acc.AccountCode || ''
          };
        }
      });

      // Stores list for store names
      const storeRes = await getDataFundtion("/Store");
      const stores = Array.isArray(storeRes) ? storeRes : (storeRes?.data || []);
      const storeLookup = {};
      stores.forEach(s => { storeLookup[s._id] = s.StoreName || ''; });

      // Missing store, store "0", unknown store id, and Head Office name variants
      // all belong to the same Head Office group — do not split them.
      const normalizeStoreName = (rawStoreId) => {
        if (!rawStoreId || rawStoreId === 'none' || rawStoreId === '0' || rawStoreId === 0) {
          return 'Head Office';
        }
        const name = (storeLookup[rawStoreId] || '').trim();
        if (!name || /^head\s*office$/i.test(name)) return 'Head Office';
        return name;
      };

      // Single API call for whole year, all expense accounts
      const accountIdsStr = Object.keys(accountLookup).join(',');
      if (!accountIdsStr) {
        setStoreGroups([]);
        setIsLoading(false);
        return;
      }

      const ledgerData = await getDataFundtion(
        `GernalLager?startDate=${data.startDate}&endDate=${data.endDate}&Account=${accountIdsStr}&Store=`
      );
      const dataArray = Array.isArray(ledgerData) ? ledgerData : [];

      // account -> storeName -> month -> {debit, credit}
      const storeMonthlyTotals = {};

      dataArray.forEach(item => {
        const accountId = item.Account;
        if (!accountId || !accountLookup[accountId]) return;

        // Skip opening/VoucherBefore entries
        if (item.Type === "VoucherBefore") return;

        const debit = Number(item.Debit) || 0;
        const credit = Number(item.Credit) || 0;
        if (debit === 0 && credit === 0) return;

        const storeName = normalizeStoreName(item.store);

        if (!storeMonthlyTotals[accountId]) storeMonthlyTotals[accountId] = {};
        if (!storeMonthlyTotals[accountId][storeName]) {
          storeMonthlyTotals[accountId][storeName] = Array.from({ length: 12 }, () => ({ debit: 0, credit: 0 }));
        }

        const date = item.VoucherDate ? new Date(item.VoucherDate) : null;
        const calMonth = date && !isNaN(date.getTime()) ? date.getMonth() : null;
        if (calMonth !== null) {
          const fiscalIdx = toFiscalMonth(calMonth);
          storeMonthlyTotals[accountId][storeName][fiscalIdx].debit += debit;
          storeMonthlyTotals[accountId][storeName][fiscalIdx].credit += credit;
        }
      });

      // Collect all unique store names across all accounts
      const allStoreNames = new Set();
      Object.keys(storeMonthlyTotals).forEach(accountId => {
        Object.keys(storeMonthlyTotals[accountId]).forEach(storeName => {
          allStoreNames.add(storeName);
        });
      });

      // Build store-grouped data: storeName -> accounts
      const storeGroupMap = {};
      allStoreNames.forEach(storeName => {
        storeGroupMap[storeName] = { storeName, accounts: [] };
      });

      Object.keys(accountLookup).forEach(accountId => {
        const storeMap = storeMonthlyTotals[accountId];
        if (!storeMap) return;

        const code = accountLookup[accountId].code;
        const accountName = accountLookup[accountId].name;

        Object.keys(storeMap).forEach(storeName => {
          const months = storeMap[storeName];
          const monthBalances = months.map(m => m.debit - m.credit);
          const total = monthBalances.reduce((s, v) => s + v, 0);
          storeGroupMap[storeName].accounts.push({
            code,
            accountName,
            Months: monthBalances.map(v => Number(v.toFixed(2))),
            Total: Number(total.toFixed(2))
          });
        });
      });

      // Sort accounts within each store by code
      Object.values(storeGroupMap).forEach(group => {
        group.accounts.sort((a, b) => (parseFloat(a.code) || 0) - (parseFloat(b.code) || 0));
      });

      // Sort stores by name; only include stores that have accounts
      const result = Object.values(storeGroupMap)
        .filter(g => g.accounts.length > 0)
        .sort((a, b) => a.storeName.localeCompare(b.storeName));

      setStoreGroups(result);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching expense report data:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  // ================= Grand Totals (across all stores) =================
  const grandTotalMonths = MONTH_LABELS.map((_, i) =>
    storeGroups.reduce((s, group) =>
      s + group.accounts.reduce((sa, acc) => sa + acc.Months[i], 0), 0
    )
  );
  const grandTotal = storeGroups.reduce((s, group) =>
    s + group.accounts.reduce((sa, acc) => sa + acc.Total, 0), 0
  );

  // ================= Excel Export =================
  const downloadExcel = async () => {
    setIsExporting(true);
    try {
      const exportRows = [];

      storeGroups.forEach(group => {
        const heading = {
          'Account No': group.storeName,
          'Account Name': '',
        };
        MONTH_LABELS.forEach((label) => {
          heading[label] = '';
        });
        heading.Total = '';
        exportRows.push(heading);

        group.accounts.forEach(acc => {
          const row = {
            'Account No': acc.code,
            'Account Name': acc.accountName,
          };
          MONTH_LABELS.forEach((label, i) => {
            row[label] = acc.Months[i] || '';
          });
          row.Total = acc.Total;
          exportRows.push(row);
        });

        const storeMonthTotals = MONTH_LABELS.map((_, i) =>
          group.accounts.reduce((s, acc) => s + acc.Months[i], 0)
        );
        const storeTotal = group.accounts.reduce((s, acc) => s + acc.Total, 0);
        const subtotal = {
          'Account No': '',
          'Account Name': `${group.storeName} - Total`,
        };
        MONTH_LABELS.forEach((label, i) => {
          subtotal[label] = storeMonthTotals[i] || '';
        });
        subtotal.Total = storeTotal;
        exportRows.push(subtotal);
      });

      const grand = {
        'Account No': '',
        'Account Name': 'GRAND TOTAL',
      };
      MONTH_LABELS.forEach((label, i) => {
        grand[label] = grandTotalMonths[i] || '';
      });
      grand.Total = grandTotal;
      exportRows.push(grand);

      await exportProfessionalExcel({
        title: 'Period Expense Report - Store Wise Breakup',
        fileName: 'Period_Expense_Report_StoreWise',
        sheetName: 'Store Wise Breakup',
        rows: exportRows,
        meta: [
          `Year: ${data.yearLabel}`,
          `Period: ${data.startDate} to ${data.endDate}`,
          'Only expense accounts (5xxx) are shown',
        ],
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
      doc.text("Period Expense Report - Store Wise Breakup", pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Year: ${data.yearLabel}`, 14, 22);
      doc.text(`Period: ${data.startDate} to ${data.endDate}`, 14, 28);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

      const breakupHead = [['Account No', 'Account Name', ...MONTH_LABELS, 'Total']];
      const breakupBody = [];

      storeGroups.forEach(group => {
        // Store heading
        breakupBody.push([
          { content: group.storeName, colSpan: 14, styles: { fontStyle: 'bold', fillColor: [230, 240, 250] } }
        ]);

        group.accounts.forEach(acc => {
          breakupBody.push([
            acc.code,
            acc.accountName,
            ...acc.Months.map(v => (v ? fmt(v) : '')),
            fmt(acc.Total)
          ]);
        });

        // Store sub-total
        const storeMonthTotals = MONTH_LABELS.map((_, i) =>
          group.accounts.reduce((s, acc) => s + acc.Months[i], 0)
        );
        const storeTotal = group.accounts.reduce((s, acc) => s + acc.Total, 0);
        breakupBody.push([
          '', `${group.storeName} - Total`,
          ...storeMonthTotals.map(v => fmt(v)),
          fmt(storeTotal)
        ]);
      });

      // Grand total
      breakupBody.push([
        '', 'GRAND TOTAL',
        ...grandTotalMonths.map(v => fmt(v)),
        fmt(grandTotal)
      ]);

      autoTable(doc, {
        head: breakupHead,
        body: breakupBody,
        startY: 40,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [66, 139, 202], fontSize: 7 },
        footStyles: { fillColor: [44, 62, 80], fontStyle: 'bold', fontSize: 7 },
        margin: { top: 35 },
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
      doc.save(`Period_Expense_Report_StoreWise_${timestamp}.pdf`);
    } catch (error) {
      console.error("Export to PDF failed:", error);
      alert("Failed to export to PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // ================= Print =================
  const handlePrint = () => {
    const printContent = document.getElementById('period-expense-report');
    if (!printContent) {
      alert("Report content not found.");
      return;
    }
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>Period Expense Report - Store Wise Breakup</title>
          <style>
            body { font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th, td { padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; }
            th { background: #f8f9fa; font-weight: 600; }
            .num { text-align: right; font-family: 'Courier New', monospace; }
            tr.section-title td { background: #eef2f7; font-weight: bold; }
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
    <div style={styles.container} id="period-expense-report">
      <ReportPopupHeader title="Period Expense Report" />

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
          <div style={styles.reportTitle}>Period Expense Report</div>
          <div style={styles.reportDate}>Generated: {new Date().toLocaleDateString()}</div>
          <div style={styles.reportRange}>Year: {data.yearLabel}</div>
          <div style={styles.reportRange}>Period: {data.startDate} to {data.endDate}</div>
          <div style={styles.reportRange}>Filter: Expense Accounts (5xxx only)</div>
        </div>
      </div>

      {/* ================= Store Grouped Tables ================= */}
      {storeGroups.length > 0 ? (
        storeGroups.map((group, gi) => {
          const storeMonthTotals = MONTH_LABELS.map((_, i) =>
            group.accounts.reduce((s, acc) => s + acc.Months[i], 0)
          );
          const storeTotal = group.accounts.reduce((s, acc) => s + acc.Total, 0);

          return (
            <div key={gi} style={{ marginBottom: '24px' }}>
              {/* Store Heading */}
              <div style={styles.storeHeading}>{group.storeName}</div>

              <div style={styles.tableContainer}>
                <table style={styles.salesDataTable}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.tableHeader, minWidth: '90px' }}>Account No</th>
                      <th style={{ ...styles.tableHeader, minWidth: '220px' }}>Account Name</th>
                      {MONTH_LABELS.map((m) => (
                        <th key={m} style={styles.tableHeader}>{m}</th>
                      ))}
                      <th style={{ ...styles.tableHeader, borderRight: 'none' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.accounts.map((acc, ai) => (
                      <tr key={ai} style={{ ...styles.tableRow, backgroundColor: ai % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                        <td style={{ ...styles.tableCell, fontFamily: "'Courier New', monospace" }}>{acc.code}</td>
                        <td style={styles.tableCell}>{acc.accountName}</td>
                        {acc.Months.map((v, i) => (
                          <td key={i} style={{ ...styles.tableCell, ...styles.amount }}>{v ? fmt(v) : ''}</td>
                        ))}
                        <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>{fmt(acc.Total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#eef2f7', fontWeight: 'bold' }}>
                      <td colSpan={2} style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 'bold' }}>
                        {group.storeName} - Total
                      </td>
                      {storeMonthTotals.map((v, i) => (
                        <td key={i} style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold' }}>
                          {fmt(v)}
                        </td>
                      ))}
                      <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>
                        {fmt(storeTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })
      ) : (
        !isLoading && (
          <div style={{ ...styles.sectionTitle, textAlign: 'center', color: '#95a5a6', fontStyle: 'italic' }}>
            No expense data available for the selected year (5xxx accounts only)
          </div>
        )
      )}

      {/* Grand Total */}
      {storeGroups.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.salesDataTable}>
            <thead>
              <tr>
                <th style={{ ...styles.tableHeader, minWidth: '90px' }}>Account No</th>
                <th style={{ ...styles.tableHeader, minWidth: '220px' }}>Account Name</th>
                {MONTH_LABELS.map((m) => (
                  <th key={m} style={styles.tableHeader}>{m}</th>
                ))}
                <th style={{ ...styles.tableHeader, borderRight: 'none' }}>Total</th>
              </tr>
            </thead>
            <tfoot>
              <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                <td colSpan={2} style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 'bold', borderRight: 'none', color: 'white' }}>GRAND TOTAL</td>
                {grandTotalMonths.map((v, i) => (
                  <td key={i} style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', color: 'white' }}>{v ? fmt(v) : ''}</td>
                ))}
                <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none', color: 'white' }}>{fmt(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Export Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
        <button onClick={downloadExcel} style={styles.exportBtn} disabled={isExporting}>
          📊 Export Excel
        </button>
        <button onClick={downloadPDF} style={styles.exportBtn} disabled={isExporting}>
          📄 Export PDF
        </button>
        <button onClick={handlePrint} style={styles.exportBtn} disabled={isExporting}>
          🖨️ Print
        </button>
      </div>
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
    maxWidth: '1600px',
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
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#2c3e50',
    padding: '8px 12px',
    background: '#f1f5f9',
    borderRadius: '4px',
    marginBottom: '10px',
  },
  storeHeading: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#fff',
    padding: '8px 14px',
    background: '#3b82f6',
    borderRadius: '4px',
    marginBottom: '0',
  },
  tableContainer: { overflowX: 'auto', overflowY: 'hidden', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '4px', WebkitOverflowScrolling: 'touch', minHeight: '60px' },
  salesDataTable: { minWidth: '1100px', borderCollapse: 'collapse', fontSize: '12px', width: '100%' },
  tableHeader: { background: '#f1f5f9', padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#1e293b', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #cbd5e1', whiteSpace: 'nowrap', position: 'sticky', top: 0 },
  tableRow: { borderBottom: '1px solid #e2e8f0' },
  tableCell: { padding: '8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' },
  amount: { textAlign: 'right', fontFamily: "'Courier New', monospace" },
  noData: { textAlign: 'center', padding: '30px', color: '#95a5a6', fontStyle: 'italic' },
  exportBtn: {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#f8fafc',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
  },
};

export default PeriodExpenceReportPopup;
