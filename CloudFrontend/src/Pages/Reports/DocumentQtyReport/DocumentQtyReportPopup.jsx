import React, { useEffect, useMemo, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';
import { buildReportRows, columnsFor, formatReportDate } from './reportModel';

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const formatCell = (value, type) => {
  if (type === 'date') return formatReportDate(value);
  if (type === 'qty') return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (type === 'money') {
    return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return value ?? '';
};

const displayValue = (row, column, kind) => {
  if (column.key === 'status' && kind === 'dc' && String(row.status || '').trim().toLowerCase() === 'false') {
    return 'Cancel';
  }
  return formatCell(row[column.key], column.type);
};

const viewTitle = {
  Detail: 'Detail',
  ProductSummary: 'Product Summary',
  Summary: 'Summary',
};

const DocumentQtyReportPopup = ({ config, filterData }) => {
  const columns = columnsFor(config.kind, filterData.view);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: columns[0]?.key || 'date', direction: 'ascending' });

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams({
        startDate: filterData.startDate,
        endDate: filterData.endDate,
        view: filterData.view || 'Detail',
        status: filterData.status || 'All',
      });
      const idList = (items) => (items || []).map((item) => item.value).filter(Boolean).join(',');
      const distributorIds = idList(filterData.distributors);
      const productIds = idList(filterData.products);
      if (distributorIds) params.set('distributors', distributorIds);
      if (productIds && filterData.view !== 'Summary') params.set('products', productIds);
      if (filterData.store?.value) params.set('store', filterData.store.value);
      if (filterData.city?.value) params.set('city', filterData.city.value);

      try {
        const response = await getDataFundtion(`${config.reportEndpoint}?${params.toString()}`);
        setRows(unwrapList(response));
      } catch (err) {
        if (err?.response?.status !== 404) {
          console.error(err);
          setError('Failed to load report data');
          return;
        }
        try {
          const response = await getDataFundtion(config.endpoint);
          setRows(buildReportRows(unwrapList(response), config, filterData));
        } catch (fallbackError) {
          console.error(fallbackError);
          setError('Failed to load report data');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [config, filterData]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    let next = rows;
    if (query) {
      next = rows.filter((row) => columns.some((column) => (
        String(displayValue(row, column, config.kind)).toLowerCase().includes(query)
      )));
    }
    if (!sort.key) return next;
    const column = columns.find((item) => item.key === sort.key);
    const direction = sort.direction === 'ascending' ? 1 : -1;
    return [...next].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      if (column?.type === 'qty' || column?.type === 'money') {
        return (Number(left) - Number(right)) * direction;
      }
      return String(left ?? '').localeCompare(String(right ?? '')) * direction;
    });
  }, [rows, search, sort, columns]);

  const totals = useMemo(() => {
    const sums = {};
    columns.forEach((column) => {
      if ((column.type === 'qty' || column.type === 'money') && column.total !== false) sums[column.key] = 0;
    });
    visibleRows.forEach((row) => {
      Object.keys(sums).forEach((key) => {
        sums[key] += Number(row[key]) || 0;
      });
    });
    return sums;
  }, [visibleRows, columns]);

  const requestSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'ascending' ? 'descending' : 'ascending',
    }));
  };

  const exportToExcel = async () => {
    if (visibleRows.length === 0) {
      toast.error('No data to export');
      return;
    }
    const exportRows = visibleRows.map((row, index) => {
      const record = { '#': index + 1 };
      columns.forEach((column) => {
        record[column.label] = column.type === 'qty' || column.type === 'money'
          ? Number(row[column.key] || 0)
          : displayValue(row, column, config.kind);
      });
      return record;
    });
    const title = `${config.title} ${viewTitle[filterData.view] || ''}`.trim();
    await exportProfessionalExcel({
      title,
      fileName: `${config.title.replace(/\s+/g, '_')}_${filterData.view}_${filterData.startDate}_to_${filterData.endDate}`,
      sheetName: title.slice(0, 31),
      rows: exportRows,
      meta: [`Period: ${filterData.startDate} to ${filterData.endDate}`],
    });
  };

  const firstNumeric = Math.max(columns.findIndex((column) => column.type === 'qty' || column.type === 'money'), 0);

  return (
    <div className="doc-report">
      <ToastContainer />
      <header className="doc-report-header">
        <p className="doc-report-eyebrow">Pearl Dynamic (pvt) ltd</p>
        <h1>{config.title}</h1>
        <p>{viewTitle[filterData.view] || 'Detail'}</p>
        <p>Period: {formatReportDate(filterData.startDate)} to {formatReportDate(filterData.endDate)}</p>
      </header>

      <div className="doc-report-toolbar no-print">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search..."
        />
        <span>{visibleRows.length} records</span>
        <button type="button" onClick={exportToExcel}>Export Excel</button>
        <button type="button" onClick={() => window.print()}>Print</button>
      </div>

      {loading ? <p className="doc-report-message">Loading report...</p> : null}
      {error ? <p className="doc-report-message">{error}</p> : null}

      {!loading && !error ? (
        <div className="doc-report-table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                {columns.map((column) => (
                  <th key={column.key} onClick={() => requestSort(column.key)}>
                    {column.label}
                    {sort.key === column.key ? (sort.direction === 'ascending' ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="doc-report-empty">No records found</td>
                </tr>
              ) : visibleRows.map((row, index) => (
                <tr key={`${row.code}-${row.product || ''}-${row.orderCode || ''}-${index}`}>
                  <td>{index + 1}</td>
                  {columns.map((column) => (
                    <td key={column.key} className={column.type ? 'num' : ''}>
                      {displayValue(row, column, config.kind)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {visibleRows.length > 0 ? (
              <tfoot>
                <tr>
                  <td colSpan={firstNumeric + 1}>Total</td>
                  {columns.slice(firstNumeric).map((column) => (
                    <td key={column.key} className={column.type ? 'num' : ''}>
                      {column.type && column.total !== false ? formatCell(totals[column.key], column.type) : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      ) : null}

      <style>{`
        .doc-report { font-family: Segoe UI, Roboto, sans-serif; color: #1f2937; padding: 24px; background: #fff; }
        .doc-report-header { margin-bottom: 16px; border-bottom: 3px solid #185fa5; padding-bottom: 12px; }
        .doc-report-eyebrow { margin: 0; color: #185fa5; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
        .doc-report-header h1 { margin: 4px 0; font-size: 28px; }
        .doc-report-header p { margin: 2px 0; color: #4b5563; }
        .doc-report-toolbar { display: flex; gap: 12px; align-items: center; margin: 16px 0; }
        .doc-report-toolbar input { flex: 1; max-width: 320px; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; }
        .doc-report-toolbar button { background: #185fa5; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
        .doc-report-table-wrap { overflow: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px 10px; white-space: nowrap; }
        th { background: #185fa5; color: #fff; cursor: pointer; text-align: left; }
        td.num, th.num { text-align: right; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        tfoot td { background: #e6f1fb; font-weight: 700; }
        .doc-report-empty, .doc-report-message { text-align: center; padding: 28px; color: #6b7280; }
        @media print {
          .no-print { display: none !important; }
          .doc-report { padding: 0; }
          th { color: #111; background: #e5e7eb; }
        }
      `}</style>
    </div>
  );
};

export default DocumentQtyReportPopup;
