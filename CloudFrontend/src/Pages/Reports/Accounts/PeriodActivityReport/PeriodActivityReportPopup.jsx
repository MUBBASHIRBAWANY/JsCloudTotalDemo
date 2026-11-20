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

const PeriodActivityReportPopup = ({ data }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [storeRows, setStoreRows] = useState([]); // store-wise breakup grouped by account

  // ================= Data Fetch & Grouping =================
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
            code: acc.AccountCode || ''
          };
        }
      });

      // Stores list for store names
      const storeRes = await getDataFundtion("/Store");
      const stores = Array.isArray(storeRes) ? storeRes : (storeRes?.data || []);
      const storeLookup = {};
      stores.forEach(s => { storeLookup[s._id] = s.StoreName || ''; });

      // Single API call for whole year, all accounts
      const accountIdsStr = Object.keys(accountLookup).join(',');
      if (!accountIdsStr) {
        setStoreRows([]);
        setIsLoading(false);
        return;
      }

      const ledgerData = await getDataFundtion(
        `GernalLager?startDate=${data.startDate}&endDate=${data.endDate}&Account=${accountIdsStr}&Store=`
      );
      const dataArray = Array.isArray(ledgerData) ? ledgerData : [];

      // account -> store -> month -> {debit, credit}
      const storeMonthlyTotals = {};

      dataArray.forEach(item => {
        const accountId = item.Account;
        if (!accountId || !accountLookup[accountId]) return;

        // Skip opening/VoucherBefore entries
        if (item.Type === "VoucherBefore") return;

        const debit = Number(item.Debit) || 0;
        const credit = Number(item.Credit) || 0;
        if (debit === 0 && credit === 0) return;

        const storeId = item.store || 'none';

        if (!storeMonthlyTotals[accountId]) storeMonthlyTotals[accountId] = {};
        if (!storeMonthlyTotals[accountId][storeId]) {
          storeMonthlyTotals[accountId][storeId] = Array.from({ length: 12 }, () => ({ debit: 0, credit: 0 }));
        }

        const date = item.VoucherDate ? new Date(item.VoucherDate) : null;
        const calMonth = date && !isNaN(date.getTime()) ? date.getMonth() : null;
        if (calMonth !== null) {
          const fiscalIdx = toFiscalMonth(calMonth);
          storeMonthlyTotals[accountId][storeId][fiscalIdx].debit += debit;
          storeMonthlyTotals[accountId][storeId][fiscalIdx].credit += credit;
        }
      });

      // Build store-wise breakup rows (grouped by account)
      const breakup = [];
      Object.keys(accountLookup).forEach(accountId => {
        const storeMap = storeMonthlyTotals[accountId];
        if (!storeMap) return;

        const code = accountLookup[accountId].code;
        const accountName = accountLookup[accountId].name;

        const storeList = Object.keys(storeMap).map(storeId => {
          const months = storeMap[storeId];
          const monthBalances = months.map(m => m.debit - m.credit);
          const total = monthBalances.reduce((s, v) => s + v, 0);
          return {
            storeName: storeId === 'none' ? 'Head Office' : (storeLookup[storeId] || 'Head Office'),
            Months: monthBalances.map(v => Number(v.toFixed(2))),
            Total: Number(total.toFixed(2))
          };
        }).sort((a, b) => a.storeName.localeCompare(b.storeName));

        if (storeList.length > 0) {
          breakup.push({ code, AccountName: accountName, stores: storeList });
        }
      });

      breakup.sort((a, b) => (parseFloat(a.code) || 0) - (parseFloat(b.code) || 0));
      setStoreRows(breakup);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching period activity data:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  // ================= Totals =================
  const grandTotalMonths = MONTH_LABELS.map((_, i) =>
    storeRows.reduce((s, group) =>
      s + group.stores.reduce((ss, st) => ss + st.Months[i], 0), 0
    )
  );
  const grandTotal = storeRows.reduce((s, group) =>
    s + group.stores.reduce((ss, st) => ss + st.Total, 0), 0
  );

  // ================= Excel Export =================
  const downloadExcel = async () => {
    setIsExporting(true);
    try {
      const exportRows = [];
      storeRows.forEach(group => {
        group.stores.forEach((st, idx) => {
          const row = {
            'Account No': idx === 0 ? group.code : '',
            'Account Name': idx === 0 ? group.AccountName : '',
            'Store': st.storeName,
          };
          MONTH_LABELS.forEach((label, i) => {
            row[label] = st.Months[i] || '';
          });
          row.Total = st.Total;
          exportRows.push(row);
        });
        const subtotal = {
          'Account No': '',
          'Account Name': '',
          'Store': `${group.AccountName} - Total`,
        };
        MONTH_LABELS.forEach((label, i) => {
          subtotal[label] = group.stores.reduce((s, st) => s + st.Months[i], 0);
        });
        subtotal.Total = group.stores.reduce((s, st) => s + st.Total, 0);
        exportRows.push(subtotal);
      });
      const grand = {
        'Account No': '',
        'Account Name': '',
        'Store': 'GRAND TOTAL',
      };
      MONTH_LABELS.forEach((label, i) => {
        grand[label] = grandTotalMonths[i] || '';
      });
      grand.Total = grandTotal;
      exportRows.push(grand);

      await exportProfessionalExcel({
        title: 'Period Activity Report - Store Wise Breakup',
        fileName: 'Period_Activity_Report_StoreWise',
        sheetName: 'Store Wise Breakup',
        rows: exportRows,
        meta: [
          `Year: ${data.yearLabel}`,
          `Period: ${data.startDate} to ${data.endDate}`,
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
      doc.text("Period Activity Report - Store Wise Breakup", pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Year: ${data.yearLabel}`, 14, 22);
      doc.text(`Period: ${data.startDate} to ${data.endDate}`, 14, 28);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

      const breakupHead = [['Account No', 'Account Name', 'Store', ...MONTH_LABELS, 'Total']];
      const breakupBody = [];
      storeRows.forEach(group => {
        group.stores.forEach((st, idx) => {
          breakupBody.push([
            idx === 0 ? group.code : '',
            idx === 0 ? group.AccountName : '',
            st.storeName,
            ...st.Months.map(v => (v ? fmt(v) : '')),
            fmt(st.Total)
          ]);
        });
        breakupBody.push([
          '', '', `${group.AccountName} - Total`,
          ...MONTH_LABELS.map((_, i) => fmt(group.stores.reduce((s, st) => s + st.Months[i], 0))),
          fmt(group.stores.reduce((s, st) => s + st.Total, 0))
        ]);
      });
      breakupBody.push([
        '', '', 'GRAND TOTAL',
        ...grandTotalMonths.map(v => (v ? fmt(v) : '')),
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
      doc.save(`Period_Activity_Report_StoreWise_${timestamp}.pdf`);
    } catch (error) {
      console.error("Export to PDF failed:", error);
      alert("Failed to export to PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // ================= Print =================
  const handlePrint = () => {
    const printContent = document.getElementById('period-activity-report');
    if (!printContent) {
      alert("Report content not found.");
      return;
    }
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>Period Activity Report - Store Wise Breakup</title>
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
    <div style={styles.container} id="period-activity-report">
      <ReportPopupHeader title="Period Activity Report" />

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
          <div style={styles.reportTitle}>Period Activity Report</div>
          <div style={styles.reportDate}>Generated: {new Date().toLocaleDateString()}</div>
          <div style={styles.reportRange}>Year: {data.yearLabel}</div>
          <div style={styles.reportRange}>Period: {data.startDate} to {data.endDate}</div>
        </div>
      </div>

      {/* ================= Store Wise Breakup Table ================= */}
      <div style={{ ...styles.sectionTitle }}>Store Wise Breakup</div>

      <div style={styles.tableContainer}>
        <table style={styles.salesDataTable}>
          <thead>
            <tr>
              <th style={{ ...styles.tableHeader, minWidth: '90px' }}>Account No</th>
              <th style={{ ...styles.tableHeader, minWidth: '180px' }}>Account Name</th>
              <th style={{ ...styles.tableHeader, minWidth: '150px' }}>Store</th>
              {MONTH_LABELS.map((m) => (
                <th key={m} style={styles.tableHeader}>{m}</th>
              ))}
              <th style={{ ...styles.tableHeader, borderRight: 'none' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {storeRows.length > 0 ? (
              storeRows.map((group, gi) => (
                <React.Fragment key={`${group.code}-${gi}`}>
                  {group.stores.map((st, si) => (
                    <tr key={si} style={{ ...styles.tableRow, backgroundColor: si % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ ...styles.tableCell, fontFamily: "'Courier New', monospace" }}>{si === 0 ? group.code : ''}</td>
                      <td style={{ ...styles.tableCell }}>{si === 0 ? group.AccountName : ''}</td>
                      <td style={{ ...styles.tableCell, paddingLeft: '24px' }}>{st.storeName}</td>
                      {st.Months.map((v, i) => (
                        <td key={i} style={{ ...styles.tableCell, ...styles.amount }}>{v ? fmt(v) : ''}</td>
                      ))}
                      <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>{fmt(st.Total)}</td>
                    </tr>
                  ))}
                  {/* Account sub-total row */}
                  <tr style={{ backgroundColor: '#eef2f7', fontWeight: 'bold' }}>
                    <td colSpan={2} style={{ ...styles.tableCell, textAlign: 'right' }}>{group.AccountName} - Total</td>
                    <td style={{ ...styles.tableCell }}></td>
                    {MONTH_LABELS.map((_, i) => (
                      <td key={i} style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold' }}>
                        {fmt(group.stores.reduce((s, st) => s + st.Months[i], 0))}
                      </td>
                    ))}
                    <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none' }}>
                      {fmt(group.stores.reduce((s, st) => s + st.Total, 0))}
                    </td>
                  </tr>
                </React.Fragment>
              ))
            ) : (
              !isLoading && (
                <tr>
                  <td colSpan={16} style={{ ...styles.tableCell, ...styles.noData, borderLeft: '1px solid #e2e8f0', borderRight: 'none' }}>
                    No period activity data available for the selected year
                  </td>
                </tr>
              )
            )}
          </tbody>
          {storeRows.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                <td colSpan={2} style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 'bold', borderRight: 'none', color: 'white' }}>GRAND TOTAL</td>
                <td style={{ ...styles.tableCell, borderRight: 'none', color: 'white' }}></td>
                {grandTotalMonths.map((v, i) => (
                  <td key={i} style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', color: 'white' }}>{v ? fmt(v) : ''}</td>
                ))}
                <td style={{ ...styles.tableCell, ...styles.amount, fontWeight: 'bold', borderRight: 'none', color: 'white' }}>{fmt(grandTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

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
  tableContainer: { overflowX: 'auto', overflowY: 'hidden', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '20px', WebkitOverflowScrolling: 'touch', minHeight: '120px' },
  salesDataTable: { minWidth: '1200px', borderCollapse: 'collapse', fontSize: '12px', width: '100%' },
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

export default PeriodActivityReportPopup;
