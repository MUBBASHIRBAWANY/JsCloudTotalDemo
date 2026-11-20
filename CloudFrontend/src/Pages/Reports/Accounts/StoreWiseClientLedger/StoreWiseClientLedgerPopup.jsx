import React, { useEffect, useMemo, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';

const money = (value) => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDate = (value) => {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return value || '';
  return new Date(`${match[1]}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const detailColumns = [
  { key: 'client', label: 'Client' },
  { key: 'code', label: 'Code' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'voucherNo', label: 'Voucher' },
  { key: 'ref', label: 'Ref' },
  { key: 'narration', label: 'Narration' },
  { key: 'debit', label: 'Debit', type: 'money' },
  { key: 'credit', label: 'Credit', type: 'money' },
  { key: 'balance', label: 'Balance', type: 'money' },
];

const summaryColumns = [
  { key: 'client', label: 'Client' },
  { key: 'code', label: 'Code' },
  { key: 'opening', label: 'Opening', type: 'money' },
  { key: 'debit', label: 'Debit', type: 'money' },
  { key: 'credit', label: 'Credit', type: 'money' },
  { key: 'closing', label: 'Closing', type: 'money' },
];

const StoreWiseClientLedgerPopup = ({ title, filterData }) => {
  const columns = filterData.view === 'Summary' ? summaryColumns : detailColumns;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams({
          startDate: filterData.startDate,
          endDate: filterData.endDate,
          store: filterData.store,
          view: filterData.view,
        });
        const response = await getDataFundtion(`/GernalLager/StoreWiseClientLedger?${params.toString()}`);
        setRows(Array.isArray(response?.rows) ? response.rows : []);
      } catch (err) {
        console.error(err);
        setError('Failed to load ledger');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filterData]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => columns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(query)));
  }, [rows, search, columns]);

  const totals = useMemo(() => visibleRows.reduce((sum, row) => {
    columns.forEach((column) => {
      if (column.type === 'money' && column.key !== 'balance') sum[column.key] = (sum[column.key] || 0) + Number(row[column.key] || 0);
    });
    return sum;
  }, {}), [visibleRows, columns]);

  const exportExcel = async () => {
    if (!visibleRows.length) return toast.error('No data to export');
    await exportProfessionalExcel({
      title,
      fileName: `${title.replace(/\s+/g, '_')}_${filterData.startDate}_to_${filterData.endDate}`,
      sheetName: 'Ledger',
      rows: visibleRows.map((row, index) => {
        const record = { '#': index + 1 };
        columns.forEach((column) => {
          record[column.label] = column.type === 'date' ? formatDate(row[column.key]) : column.type === 'money' ? Number(row[column.key] || 0) : (row[column.key] ?? '');
        });
        return record;
      }),
      meta: [`Store: ${filterData.storeName}`, `Period: ${filterData.startDate} to ${filterData.endDate}`],
    });
  };

  const firstMoney = Math.max(columns.findIndex((column) => column.type === 'money'), 0);

  return (
    <div className="store-ledger">
      <ToastContainer />
      <header>
        <p>Pearl Dynamic (pvt) ltd</p>
        <h1>{title}</h1>
        <p>Store: {filterData.storeName}</p>
        <p>Period: {formatDate(filterData.startDate)} to {formatDate(filterData.endDate)}</p>
      </header>
      <div className="toolbar no-print">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." />
        <span>{visibleRows.length} rows</span>
        <button type="button" onClick={exportExcel}>Export Excel</button>
        <button type="button" onClick={() => window.print()}>Print</button>
      </div>
      {loading ? <p className="message">Loading ledger...</p> : null}
      {error ? <p className="message">{error}</p> : null}
      {!loading && !error ? (
        <table>
          <thead>
            <tr>
              <th>#</th>
              {columns.map((column) => <th key={column.key}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr><td colSpan={columns.length + 1}>No ledger records for this store</td></tr>
            ) : visibleRows.map((row, index) => (
              <tr key={`${row.client}-${row.voucherNo || row.code}-${index}`}>
                <td>{index + 1}</td>
                {columns.map((column) => (
                  <td key={column.key} className={column.type === 'money' ? 'num' : ''}>
                    {column.type === 'date' ? formatDate(row[column.key]) : column.type === 'money' ? money(row[column.key]) : (row[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {visibleRows.length > 0 ? (
            <tfoot>
              <tr>
                <td colSpan={firstMoney + 1}>Total</td>
                {columns.slice(firstMoney).map((column) => (
                  <td key={column.key} className="num">{column.type === 'money' && column.key !== 'balance' ? money(totals[column.key]) : ''}</td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      ) : null}
      <style>{`
        .store-ledger { font-family: Segoe UI, sans-serif; padding: 24px; color: #1f2937; }
        header { border-bottom: 3px solid #185fa5; margin-bottom: 16px; }
        header p { margin: 2px 0; color: #4b5563; }
        header h1 { margin: 4px 0; }
        .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
        .toolbar input { border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; }
        .toolbar button { background: #185fa5; color: white; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; white-space: nowrap; }
        th { background: #185fa5; color: white; text-align: left; }
        td.num { text-align: right; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        tfoot td { font-weight: 700; background: #e6f1fb; }
        .message { text-align: center; color: #6b7280; padding: 24px; }
        @media print { .no-print { display: none !important; } }
      `}</style>
    </div>
  );
};

export default StoreWiseClientLedgerPopup;
