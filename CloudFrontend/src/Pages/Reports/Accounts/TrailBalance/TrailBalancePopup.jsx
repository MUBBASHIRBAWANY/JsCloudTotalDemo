import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';

const money = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const debitOf = (balance) => (balance > 0 ? Math.abs(balance) : 0);
const creditOf = (balance) => (balance < 0 ? Math.abs(balance) : 0);

const TrailBalancesPopup = ({ data }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [groups, setGroups] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState({});

  const openingOnly = Boolean(data?.openingOnly) || data?.balanceMode === 'opening';

  const flatRows = useMemo(
    () => groups.flatMap((g) => g.accounts || []),
    [groups]
  );

  const totalDebit = summary?.totalDebit ?? flatRows.reduce((s, r) => s + debitOf(r.Balance), 0);
  const totalCredit = summary?.totalCredit ?? flatRows.reduce((s, r) => s + creditOf(r.Balance), 0);
  const difference = Number((totalDebit - totalCredit).toFixed(3));
  const isBalanced = Math.abs(difference) < 0.005;

  const getData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        startDate: data.startDate,
        endDate: data.endDate,
        stage: data.stage || 'Stage4',
        openingOnly: openingOnly ? 'true' : 'false',
      });
      if (data.fromAccount) params.set('fromAccount', data.fromAccount);
      if (data.toAccount) params.set('toAccount', data.toAccount);
      if (data.store) {
        params.set('Store', Array.isArray(data.store) ? data.store.join(',') : data.store);
      }

      const res = await getDataFundtion(`GernalLager/TrailBalance?${params.toString()}`);
      const apiGroups = Array.isArray(res?.groups) ? res.groups : [];
      if (apiGroups.length) {
        setGroups(apiGroups);
      } else {
        // Fallback: build Stage-3 groups from flat rows
        const rows = Array.isArray(res?.rows) ? res.rows : (Array.isArray(res) ? res : []);
        const map = new Map();
        rows.forEach((row) => {
          const key = row.Stage3 || `code:${row.Stage3Code || row.code?.slice?.(0, 5) || 'NA'}`;
          if (!map.has(key)) {
            map.set(key, {
              Stage3: row.Stage3,
              Stage3Code: row.Stage3Code || '',
              Stage3Name: row.Stage3Name || 'Unclassified',
              accounts: [],
              BalanceDebit: 0,
              BalanceCredit: 0,
            });
          }
          const g = map.get(key);
          g.accounts.push(row);
          g.BalanceDebit += debitOf(row.Balance);
          g.BalanceCredit += creditOf(row.Balance);
        });
        setGroups(Array.from(map.values()).map((g) => ({
          ...g,
          BalanceDebit: Number(g.BalanceDebit.toFixed(3)),
          BalanceCredit: Number(g.BalanceCredit.toFixed(3)),
          accountCount: g.accounts.length,
        })));
      }
      setSummary(res?.summary || null);
      setMeta({
        openingOnly: res?.openingOnly ?? openingOnly,
        mode: res?.mode,
        beforeDate: res?.beforeDate,
        openingStart: res?.openingStart,
      });
    } catch (err) {
      console.error('Error fetching trial balance data:', err);
      setGroups([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modeLabel = meta.openingOnly
    ? 'Opening Only (no period transactions)'
    : 'Full Trial Balance';

  const downloadPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(15);
      doc.text('Trial Balance', pageWidth / 2, 14, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Period: ${data.startDate} to ${data.endDate}  |  ${modeLabel}`, 14, 22);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

      const body = [];
      groups.forEach((group) => {
        body.push([
          {
            content: `${group.Stage3Code || ''}  ${group.Stage3Name || 'Unclassified'}`,
            colSpan: 5,
            styles: { fillColor: [226, 232, 240], fontStyle: 'bold', textColor: [15, 23, 42] },
          },
        ]);
        (group.accounts || []).forEach((item, index) => {
          body.push([
            String(index + 1),
            item.code || '',
            item.AccountName || '',
            debitOf(item.Balance) ? money(debitOf(item.Balance)) : '',
            creditOf(item.Balance) ? money(creditOf(item.Balance)) : '',
          ]);
        });
        body.push([
          '',
          '',
          `Total — ${group.Stage3Name || ''}`,
          money(group.BalanceDebit),
          money(group.BalanceCredit),
        ]);
      });

      autoTable(doc, {
        head: [['#', 'Account No', 'Account Name', 'Debit', 'Credit']],
        body,
        startY: 34,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
        },
      });

      doc.save(`Trial_Balance_${data.startDate}_${data.endDate}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadExcel = async () => {
    setIsExporting(true);
    try {
      const exportData = [];
      groups.forEach((group) => {
        exportData.push({
          '#': '',
          'Account No': group.Stage3Code || '',
          'Account Name': `STAGE 3 — ${group.Stage3Name || 'Unclassified'}`,
          Debit: '',
          Credit: '',
        });
        (group.accounts || []).forEach((row, index) => {
          exportData.push({
            '#': index + 1,
            'Account No': row.code,
            'Account Name': row.AccountName,
            Debit: debitOf(row.Balance) || '',
            Credit: creditOf(row.Balance) || '',
          });
        });
        exportData.push({
          '#': '',
          'Account No': '',
          'Account Name': `Total — ${group.Stage3Name || ''}`,
          Debit: group.BalanceDebit,
          Credit: group.BalanceCredit,
        });
      });
      exportData.push({
        '#': '',
        'Account No': '',
        'Account Name': 'GRAND TOTAL',
        Debit: totalDebit,
        Credit: totalCredit,
      });

      await exportProfessionalExcel({
        title: 'Trial Balance',
        fileName: 'Trial_Balance_Report',
        sheetName: 'Trial Balance',
        rows: exportData,
        meta: [
          `Period: ${data.startDate} to ${data.endDate}`,
          `Mode: ${modeLabel}`,
        ],
      });
    } catch (error) {
      console.error(error);
      alert('Failed to export Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('trail-balance-report');
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Trial Balance</title>
          <style>
            body { font-family: "Segoe UI", Arial, sans-serif; padding: 18px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { padding: 7px 8px; border: 1px solid #cbd5e1; }
            th { background: #e2e8f0; text-align: left; }
            .right { text-align: right; font-variant-numeric: tabular-nums; }
            .group { background: #e2e8f0; font-weight: 700; }
            .subtotal { background: #f8fafc; font-weight: 700; }
            .grand { background: #0f172a; color: #fff; font-weight: 700; }
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
    }, 400);
  };

  let serial = 0;

  return (
    <div style={styles.page}>
      <div style={styles.container} id="trail-balance-report">
        <ReportPopupHeader title="Trial Balance" />

        {(isLoading || isExporting) && (
          <div style={styles.loader}>
            <div style={styles.spinner} />
            <p>{isExporting ? 'Exporting...' : 'Loading Trial Balance...'}</p>
          </div>
        )}

        <div style={styles.headerCard}>
          <div>
            <div style={styles.company}>Pearl Dynamic (Pvt) Ltd</div>
            <div style={styles.subtitle}>Statement of Trial Balance</div>
          </div>
          <div style={styles.metaBlock}>
            <div><strong>Period:</strong> {data.startDate} → {data.endDate}</div>
            <div><strong>Mode:</strong> {modeLabel}</div>
            {meta.openingOnly && meta.beforeDate ? (
              <div><strong>As of opening:</strong> {data.startDate} (thru {meta.beforeDate})</div>
            ) : null}
            <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
          </div>
        </div>

        <div style={styles.kpiRow}>
          <div style={styles.kpi}>
            <span style={styles.kpiLabel}>Accounts</span>
            <span style={styles.kpiValue}>{summary?.accounts ?? flatRows.length}</span>
          </div>
          <div style={styles.kpi}>
            <span style={styles.kpiLabel}>Stage-3 Groups</span>
            <span style={styles.kpiValue}>{summary?.stage3Groups ?? groups.length}</span>
          </div>
          <div style={styles.kpi}>
            <span style={styles.kpiLabel}>Total Debit</span>
            <span style={styles.kpiValue}>{money(totalDebit)}</span>
          </div>
          <div style={styles.kpi}>
            <span style={styles.kpiLabel}>Total Credit</span>
            <span style={styles.kpiValue}>{money(totalCredit)}</span>
          </div>
          <div style={{ ...styles.kpi, borderColor: isBalanced ? '#16a34a' : '#dc2626' }}>
            <span style={styles.kpiLabel}>Status</span>
            <span style={{ ...styles.kpiValue, color: isBalanced ? '#16a34a' : '#dc2626' }}>
              {isBalanced ? 'BALANCED' : `DIFF ${money(difference)}`}
            </span>
          </div>
        </div>

        <div style={styles.actions} className="no-print">
          <button style={styles.btn} onClick={downloadExcel} disabled={isExporting || !flatRows.length}>Excel</button>
          <button style={styles.btn} onClick={downloadPDF} disabled={isExporting || !flatRows.length}>PDF</button>
          <button style={styles.btn} onClick={handlePrint} disabled={isExporting || !flatRows.length}>Print</button>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 48, textAlign: 'center' }}>#</th>
                <th style={{ ...styles.th, width: 120 }}>Account No</th>
                <th style={styles.th}>Account Name</th>
                <th style={{ ...styles.th, width: 140, textAlign: 'right' }}>Debit</th>
                <th style={{ ...styles.th, width: 140, textAlign: 'right' }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={5} style={styles.empty}>No trial balance data for the selected criteria</td>
                </tr>
              ) : (
                groups.map((group) => (
                  <React.Fragment key={`${group.Stage3 || group.Stage3Code}-${group.Stage3Name}`}>
                    <tr>
                      <td colSpan={5} style={styles.groupRow}>
                        <span style={styles.groupCode}>{group.Stage3Code || '—'}</span>
                        <span style={styles.groupName}>{group.Stage3Name || 'Unclassified'}</span>
                        <span style={styles.groupCount}>{group.accountCount || group.accounts?.length || 0} accounts</span>
                      </td>
                    </tr>
                    {(group.accounts || []).map((item) => {
                      serial += 1;
                      return (
                        <tr key={item.Account || item._id || `${item.code}-${serial}`}>
                          <td style={{ ...styles.td, textAlign: 'center' }}>{serial}</td>
                          <td style={{ ...styles.td, fontFamily: 'ui-monospace, Consolas, monospace' }}>{item.code}</td>
                          <td style={styles.td}>{item.AccountName}</td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>
                            {debitOf(item.Balance) ? money(debitOf(item.Balance)) : ''}
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>
                            {creditOf(item.Balance) ? money(creditOf(item.Balance)) : ''}
                          </td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td colSpan={3} style={styles.subtotalLabel}>
                        Total — {group.Stage3Name || 'Unclassified'}
                      </td>
                      <td style={styles.subtotalAmt}>{money(group.BalanceDebit)}</td>
                      <td style={styles.subtotalAmt}>{money(group.BalanceCredit)}</td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
            {groups.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} style={styles.grandLabel}>Grand Total</td>
                  <td style={styles.grandAmt}>{money(totalDebit)}</td>
                  <td style={styles.grandAmt}>{money(totalCredit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #eef2f6 0%, #f8fafc 40%, #ffffff 100%)',
    padding: '20px 12px 40px',
  },
  container: {
    maxWidth: 1180,
    margin: '0 auto',
    background: '#ffffff',
    border: '1px solid #dbe3ec',
    borderRadius: 10,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
    padding: 22,
    color: '#0f172a',
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  loader: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    zIndex: 50,
  },
  spinner: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.25)',
    borderTopColor: '#fff',
    animation: 'spin 0.9s linear infinite',
    marginBottom: 12,
  },
  headerCard: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottom: '2px solid #0f172a',
    flexWrap: 'wrap',
  },
  company: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  metaBlock: {
    textAlign: 'right',
    fontSize: 12,
    color: '#334155',
    lineHeight: 1.7,
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 10,
    marginBottom: 16,
  },
  kpi: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '10px 12px',
  },
  kpiLabel: {
    display: 'block',
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  btn: {
    border: '1px solid #0f172a',
    background: '#0f172a',
    color: '#fff',
    borderRadius: 6,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  tableWrap: {
    overflowX: 'auto',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12.5,
    minWidth: 720,
  },
  th: {
    background: '#0f172a',
    color: '#f8fafc',
    padding: '10px 10px',
    textAlign: 'left',
    fontWeight: 600,
    borderRight: '1px solid #1e293b',
    position: 'sticky',
    top: 0,
  },
  td: {
    padding: '8px 10px',
    borderBottom: '1px solid #e2e8f0',
    borderRight: '1px solid #e2e8f0',
    verticalAlign: 'middle',
  },
  groupRow: {
    background: 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 100%)',
    padding: '10px 12px',
    borderBottom: '1px solid #94a3b8',
    fontWeight: 700,
  },
  groupCode: {
    display: 'inline-block',
    minWidth: 70,
    fontFamily: 'ui-monospace, Consolas, monospace',
    marginRight: 10,
    color: '#0f172a',
  },
  groupName: {
    color: '#0f172a',
  },
  groupCount: {
    float: 'right',
    color: '#64748b',
    fontWeight: 600,
    fontSize: 11,
  },
  subtotalLabel: {
    padding: '8px 10px',
    background: '#f8fafc',
    borderTop: '1px solid #94a3b8',
    borderBottom: '2px solid #64748b',
    textAlign: 'right',
    fontWeight: 700,
  },
  subtotalAmt: {
    padding: '8px 10px',
    background: '#f8fafc',
    borderTop: '1px solid #94a3b8',
    borderBottom: '2px solid #64748b',
    textAlign: 'right',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  grandLabel: {
    padding: '10px',
    background: '#0f172a',
    color: '#fff',
    textAlign: 'right',
    fontWeight: 700,
  },
  grandAmt: {
    padding: '10px',
    background: '#0f172a',
    color: '#fff',
    textAlign: 'right',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  empty: {
    padding: 28,
    textAlign: 'center',
    color: '#64748b',
    fontStyle: 'italic',
  },
};

export default TrailBalancesPopup;
