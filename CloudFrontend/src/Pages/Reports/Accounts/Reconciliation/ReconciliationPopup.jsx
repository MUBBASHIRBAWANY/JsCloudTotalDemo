import React, { useState, useEffect } from 'react';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';

const ReconciliationPopup = ({ filterData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [debits, setDebits] = useState([]);
  const [credits, setCredits] = useState([]);
  const [selectedDebits, setSelectedDebits] = useState({});
  const [selectedCredits, setSelectedCredits] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const formatAmount = (amount) => {
    if (!amount || isNaN(Number(amount))) return '0.00';
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(',', '');
  };

  const getData = async () => {
    setIsLoading(true);
    try {
      const Accountdata = await getDataFundtion(
        `GernalLager?startDate=${filterData.startDate}&endDate=${filterData.endDate}&Account=${filterData.Account}&Store=`
      );

      const sortedByDate = Accountdata.sort((a, b) => {
        const dateA = new Date(a.VoucherDate || 0);
        const dateB = new Date(b.VoucherDate || 0);
        return dateA - dateB;
      });

      const mainEntries = sortedByDate.filter(item => item.Type === "Voucher");

      const debitRows = [];
      const creditRows = [];

      mainEntries.forEach((item, index) => {
        const debit = item.Debit ? parseFloat(item.Debit) : 0;
        const credit = item.Credit ? parseFloat(item.Credit) : 0;

        const base = {
          id: item._id || index,
          date: formatDate(item.VoucherDate),
          voucherNo: item.VoucherNumber || '',
          description: item.Narration || '',
          store: item.Store || '',
          cheque: item.Cheque || item.ChqNumber || '',
          ref: item.Ref || '',
        };

        if (debit > 0) {
          debitRows.push({ ...base, amount: debit });
        }
        if (credit > 0) {
          creditRows.push({ ...base, amount: credit });
        }
      });

      setDebits(debitRows);
      setCredits(creditRows);
    } catch (err) {
      console.error('Error fetching reconciliation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [filterData]);

  const toggleDebit = (id) => {
    setSelectedDebits(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCredit = (id) => {
    setSelectedCredits(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllDebits = () => {
    const allSelected = debits.every(row => selectedDebits[row.id]);
    const newSelected = {};
    if (!allSelected) {
      debits.forEach(row => { newSelected[row.id] = true; });
    }
    setSelectedDebits(newSelected);
  };

  const toggleAllCredits = () => {
    const allSelected = credits.every(row => selectedCredits[row.id]);
    const newSelected = {};
    if (!allSelected) {
      credits.forEach(row => { newSelected[row.id] = true; });
    }
    setSelectedCredits(newSelected);
  };

  const filteredDebits = debits.filter(row =>
    !searchTerm || Object.values(row).some(val =>
      val && val.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const filteredCredits = credits.filter(row =>
    !searchTerm || Object.values(row).some(val =>
      val && val.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalDebit = debits.reduce((sum, row) => sum + row.amount, 0);
  const totalCredit = credits.reduce((sum, row) => sum + row.amount, 0);
  const difference = totalDebit - totalCredit;

  const selectedDebitTotal = debits
    .filter(row => selectedDebits[row.id])
    .reduce((sum, row) => sum + row.amount, 0);
  const selectedCreditTotal = credits
    .filter(row => selectedCredits[row.id])
    .reduce((sum, row) => sum + row.amount, 0);
  const selectedDifference = selectedDebitTotal - selectedCreditTotal;

  const exportToExcel = async () => {
    if (!filteredDebits.length && !filteredCredits.length) return;

    const columns = [
      { header: 'Sr No', key: 'Sr No' },
      { header: 'Date', key: 'Date', type: 'text' },
      { header: 'Voucher Number', key: 'Voucher Number', type: 'text' },
      { header: 'Narration', key: 'Narration', type: 'text' },
      { header: 'Amount', key: 'Amount', type: 'number' },
    ];

    const mapRows = (list) => list.map((row, index) => ({
      'Sr No': index + 1,
      'Date': row.date || '',
      'Voucher Number': row.voucherNo || '',
      'Narration': row.description || '',
      'Amount': Number(row.amount) || 0,
    }));

    const debitRows = mapRows(filteredDebits);
    const creditRows = mapRows(filteredCredits);
    const debitTotal = debitRows.reduce((sum, row) => sum + (Number(row.Amount) || 0), 0);
    const creditTotal = creditRows.reduce((sum, row) => sum + (Number(row.Amount) || 0), 0);

    try {
      await exportProfessionalExcel({
        title: 'Reconciliation Report',
        fileName: 'Reconciliation_Report',
        meta: [
          `Period: ${filterData?.startDate || ''} to ${filterData?.endDate || ''}`,
          `Total Debit: ${formatAmount(debitTotal)}`,
          `Total Credit: ${formatAmount(creditTotal)}`,
          `Difference: ${formatAmount(debitTotal - creditTotal)}`,
        ],
        excludeKeys: ['_id', 'id'],
        sheets: [
          {
            name: 'Debits',
            title: 'Reconciliation — Debits',
            rows: debitRows,
            columns,
            totals: { Date: 'TOTAL', Amount: debitTotal },
          },
          {
            name: 'Credits',
            title: 'Reconciliation — Credits',
            rows: creditRows,
            columns,
            totals: { Date: 'TOTAL', Amount: creditTotal },
          },
        ],
      });
    } catch (err) {
      console.error('Excel export error:', err);
    }
  };

  const renderTable = (rows, type) => (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={{ ...styles.th, width: '40px' }}>
            <input
              type="checkbox"
              checked={type === 'debit'
                ? debits.length > 0 && debits.every(row => selectedDebits[row.id])
                : credits.length > 0 && credits.every(row => selectedCredits[row.id])}
              onChange={type === 'debit' ? toggleAllDebits : toggleAllCredits}
            />
          </th>
          <th style={styles.th}>Date</th>
          <th style={styles.th}>Voucher</th>
          <th style={styles.th}>Description</th>
          <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? rows.map((row) => (
          <tr key={row.id} style={styles.tr}>
            <td style={styles.td}>
              <input
                type="checkbox"
                checked={type === 'debit' ? !!selectedDebits[row.id] : !!selectedCredits[row.id]}
                onChange={() => type === 'debit' ? toggleDebit(row.id) : toggleCredit(row.id)}
              />
            </td>
            <td style={styles.td}>{row.date}</td>
            <td style={styles.td}>{row.voucherNo}</td>
            <td style={styles.td}>{row.description}</td>
            <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
              {formatAmount(row.amount)}
            </td>
          </tr>
        )) : (
          <tr>
            <td colSpan="5" style={{ ...styles.td, textAlign: 'center', color: '#999' }}>No records found</td>
          </tr>
        )}
      </tbody>
      <tfoot>
        <tr style={styles.footerRow}>
          <td colSpan="4" style={{ ...styles.td, fontWeight: 'bold' }}>TOTAL</td>
          <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>
            {formatAmount(type === 'debit' ? totalDebit : totalCredit)}
          </td>
        </tr>
      </tfoot>
    </table>
  );

  return (
    <div style={styles.container}>
      <ReportPopupHeader title="Reconciliation - Unclaimed Account" />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          type="button"
          onClick={exportToExcel}
          disabled={!filteredDebits.length && !filteredCredits.length}
          style={{
            padding: '8px 16px',
            background: '#217346',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontWeight: 600,
            fontSize: 13,
            cursor: (!filteredDebits.length && !filteredCredits.length) ? 'not-allowed' : 'pointer',
            opacity: (!filteredDebits.length && !filteredCredits.length) ? 0.6 : 1,
          }}
        >
          Download Excel
        </button>
      </div>

      {isLoading && (
        <div style={styles.loader}>
          <div style={styles.spinner}></div>
          <p>Loading reconciliation data...</p>
        </div>
      )}

      {/* Summary Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Period:</span>
          <strong>{filterData.startDate} to {filterData.endDate}</strong>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Total Debit:</span>
          <strong style={{ color: '#16a34a' }}>{formatAmount(totalDebit)}</strong>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Total Credit:</span>
          <strong style={{ color: '#dc2626' }}>{formatAmount(totalCredit)}</strong>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Difference:</span>
          <strong style={{ color: difference >= 0 ? '#16a34a' : '#dc2626' }}>
            {difference >= 0 ? '+' : ''}{formatAmount(difference)}
          </strong>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchRow}>
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Two Column Layout */}
      <div style={styles.columnsContainer}>
        {/* Debits Column */}
        <div style={styles.column}>
          <div style={{ ...styles.columnHeader, background: '#dcfce7', color: '#166534' }}>
            <h3>DEBITS</h3>
            <span>{debits.length} entries</span>
          </div>
          <div style={styles.tableContainer}>
            {renderTable(filteredDebits, 'debit')}
          </div>
          {/* Selected Summary */}
          <div style={styles.selectedSummary}>
            Selected: <strong>{formatAmount(selectedDebitTotal)}</strong>
          </div>
        </div>

        {/* Credits Column */}
        <div style={styles.column}>
          <div style={{ ...styles.columnHeader, background: '#fee2e2', color: '#991b1b' }}>
            <h3>CREDITS</h3>
            <span>{credits.length} entries</span>
          </div>
          <div style={styles.tableContainer}>
            {renderTable(filteredCredits, 'credit')}
          </div>
          {/* Selected Summary */}
          <div style={styles.selectedSummary}>
            Selected: <strong>{formatAmount(selectedCreditTotal)}</strong>
          </div>
        </div>
      </div>

      {/* Selected Difference */}
      {(selectedDebitTotal > 0 || selectedCreditTotal > 0) && (
        <div style={styles.selectedDifference}>
          <span>Selected Difference:</span>
          <strong style={{ color: selectedDifference >= 0 ? '#16a34a' : '#dc2626', fontSize: '18px' }}>
            {selectedDifference >= 0 ? '+' : ''}{formatAmount(selectedDifference)}
          </strong>
        </div>
      )}

      {/* Footer */}
      <div style={styles.reportFooter}>
        Developed by JS International | Website: https://jaffersons.com/ | Contact: 0301-8251291
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: "'Segoe UI', 'Roboto', sans-serif",
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    padding: '24px',
    margin: '20px auto',
    maxWidth: '1400px',
    color: '#333',
    position: 'relative',
  },
  loader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#666',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '12px',
  },
  statsRow: {
    display: 'flex',
    gap: '32px',
    marginBottom: '16px',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    flexWrap: 'wrap',
  },
  statItem: {
    fontSize: '14px',
    color: '#475569',
  },
  statLabel: {
    marginRight: '6px',
  },
  searchRow: {
    marginBottom: '16px',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  columnsContainer: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  column: {
    flex: 1,
    minWidth: 0,
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid #e5e7eb',
  },
  tableContainer: {
    maxHeight: '50vh',
    overflowY: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    background: '#f1f5f9',
    padding: '10px 8px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#334155',
    borderBottom: '2px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '8px',
    borderBottom: '1px solid #f1f5f9',
    color: '#475569',
  },
  footerRow: {
    background: '#f8fafc',
    borderTop: '2px solid #e2e8f0',
  },
  selectedSummary: {
    padding: '8px 16px',
    background: '#f8fafc',
    borderTop: '1px solid #e5e7eb',
    fontSize: '13px',
    color: '#475569',
    textAlign: 'right',
  },
  selectedDifference: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#fffbeb',
    border: '1px solid #fbbf24',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#92400e',
    marginBottom: '16px',
  },
  reportFooter: {
    fontSize: '9px',
    textAlign: 'center',
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '10px',
    marginTop: '16px',
  },
};

export default ReconciliationPopup;
