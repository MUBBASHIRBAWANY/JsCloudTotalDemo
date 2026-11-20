import React, { useEffect, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';

/** yyyy-mm-dd for range compare; supports ISO strings and numeric Excel-style days */
function normalizeDate(val) {
  if (val == null || val === '') return null;
  const s = String(val).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  if (s.includes('T')) return s.slice(0, 10);
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (Number.isNaN(n)) return null;
    const base = Date.UTC(1899, 11, 30);
    const d = new Date(base + n * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function normalizeGroups(doc) {
  const g = doc.grouped;
  if (g == null) return [];
  return Array.isArray(g) ? g : [g];
}

/** Audit lines on the parent doc that belong to this cheque / invoice line */
function historyForRow(doc, chequeNo, invoice) {
  const list = doc.chqStatusHistory || [];
  const cn = String(chequeNo || '');
  const inv = String(invoice || '');
  return list
    .filter((h) => {
      if (h.chq != null && String(h.chq) !== '' && String(h.chq) !== cn) return false;
      const him = String(h.invoice || '');
      if (him && inv && inv !== '—') {
        const parts = him.split(',').map((s) => s.trim());
        if (!parts.includes(inv) && him !== inv) return false;
      }
      return true;
    })
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

function buildRow(doc, customerName, group, item, idx) {
  const chqNo = group?.chq ?? '';
  const lineChq = item?.chq || chqNo || '—';
  const lineInv = item?.Invoice ?? '—';
  const st = item?.status ?? item?.staus ?? group?.status ?? '—';
  return {
    _rowId: `${doc._id}_${chqNo}_${item?.id ?? item?.Invoice ?? idx}`,
    chequeNo: lineChq,
    bank: item?.Bank ?? item?.bank ?? group?.Bank ?? group?.bank ?? '—',
    amount: item?.Amount ?? '',
    customer: customerName,
    invoice: lineInv,
    status: st,
    chqReceivedDate: doc.ChqDate || '—',
    realizeDate: item?.RealizeDate || '—',
    realizationDate: item?.RealizationDate || '—',
    _normReceived: normalizeDate(doc.ChqDate),
    _normRealize: normalizeDate(item?.RealizeDate),
    _normRealization: normalizeDate(item?.RealizationDate),
    historyTimeline: historyForRow(doc, lineChq, lineInv),
    originalDocId: doc._id,
    originalGroup: group,
    originalItem: item,
  };
}

function flattenRegisterRows(docs, clientById) {
  const rows = [];

  for (const doc of docs) {
    // Get customer name from clientById map
    const customerName = clientById.get(doc.Customer)?.CutomerName ?? doc.Customer ?? '—';

    // Each document in your data is already a row item
    const lineChq = doc.chq || '—';
    const lineInv = doc.Invoice || '—';
    const status = doc.status || doc.staus || '—';

    // Only add if status is not 'Realize'
    if (status === 'Pending') {
      rows.push({
        _rowId: doc.id || `${doc._id}_${lineChq}_${lineInv}`,
        chequeNo: String(lineChq),
        bank: doc.Bank || doc.bank || '—',
        amount: doc.Amount || '',
        customer: customerName,
        invoice: lineInv,
        status: status,
        chqReceivedDate: doc.Date || doc.ChqDate || '—',
        realizeDate: doc.RealizeDate || '—',
        realizationDate: doc.RealizationDate || '—',
        _normReceived: normalizeDate(doc.Date || doc.ChqDate),
        _normRealize: normalizeDate(doc.RealizeDate),
        _normRealization: normalizeDate(doc.RealizationDate),
        historyTimeline: doc.chqStatusHistory || [],
        originalDocId: doc._id || doc.id,
        originalDoc: doc,
      });
    }
  }

  return rows;
}

function inRange(norm, start, end) {
  if (!norm || !start || !end) return false;
  return norm >= start && norm <= end;
}

const CustomerChqRegister = () => {
  const [allRows, setAllRows] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateMode, setDateMode] = useState('either');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyTitle, setHistoryTitle] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Checkbox states
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const load = async (startDate, endDate) => {
    setIsLoading(true);
    try {
      const chqRes = await getDataFundtion(`/customerChqRecived/chqReports?startdate=${startDate}&endDate=${endDate}&DateType=ChqDate`);
      console.log(chqRes)
      const flatedChqRes = chqRes.filter((item) => item.status !== " Realize" && item.staus !== "Realize" && item.status !== " Bounce"
       && item.staus !== "Bounce"
       && item.status !== " Reject" && " " + item.staus !== "Reject"
       && item.status !== " ReturntoCustomer" && " " + item.staus !== "ReturntoCustomer"
       && item.status !== " Deposit" && " " + item.staus !== "Deposit"
       && item.status !== " Clear" && " " + item.staus !== "Clear"

     )
     const  flatedChqRes3 = flatedChqRes.filter((item)=> item.staus !== "Reject")
     console.log(flatedChqRes3)
      const flatedChqRes2 = flatedChqRes3
      
      const clientRes = await getDataFundtion('/Customer/customerNameid');
      const docs = Array.isArray(flatedChqRes2) ? flatedChqRes2 : flatedChqRes2 ?? [];
      const clients = Array.isArray(clientRes) ? clientRes : clientRes?.data ?? [];
      const clientById = new Map(clients.map((c) => [c._id, c]));
      const flat = flattenRegisterRows(docs, clientById);
      setAllRows(flat);
      setRows(flat);
    } catch (e) {
      toast.error('Failed to load cheque register');
    } finally {
      setIsLoading(false);
    }
  };



  const filtered = useMemo(() => {
    if (!startDate || !endDate) return allRows;
    return allRows.filter((r) => {
      const recvOk = inRange(r._normReceived, startDate, endDate);
      const realizeOk =
        inRange(r._normRealize, startDate, endDate) ||
        inRange(r._normRealization, startDate, endDate);
      return recvOk || realizeOk;
    });
  }, [allRows, startDate, endDate, dateMode]);

  useEffect(() => {
    setRows(filtered);
    setCurrentPage(0);
    // Reset selections when filter changes
    setSelectedRows(new Set());
    setSelectAll(false);
  }, [filtered]);

  // Pagination
  const paginatedRows = useMemo(() => {
    const start = currentPage * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [rows, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const getKey = (row) => `${row.originalDocId}_${row.chequeNo}`;
  // Handle single row selection
  const handleRowSelect = (row) => {
    const key = getKey(row);

    const newSelected = new Set(selectedRows);
    console.log(newSelected)
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }

    setSelectedRows(newSelected);
  };

  // Handle select all on current page
  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect all on current page
      const newSelected = new Set(selectedRows);
      paginatedRows.forEach(row => {
        newSelected.delete(row._rowId);
      });
      setSelectedRows(newSelected);
      setSelectAll(false);
    } else {
      // Select all on current page
      const newSelected = new Set(selectedRows);
      paginatedRows.forEach(row => {
        newSelected.add(row._rowId);
      });
      setSelectedRows(newSelected);
      setSelectAll(true);
    }
  };

  // Select all rows across all pages
  const handleSelectAllPages = () => {
    const allRowIds = rows.map(row => row._rowId);
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
      setSelectAll(false);
    } else {
      setSelectedRows(new Set(allRowIds));
      setSelectAll(true);
    }
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedRows(new Set());
    setSelectAll(false);
    toast.info('Selection cleared');
  };

  // Get selected row data
  const getSelectedRowsData = () => {
    console.log(selectedRows)
    const setData = new Set(selectedRows);

    const ids = [...setData].map(item => item.split("_")[0]);
    const chq = [...setData].map(item => ({
      id : item.split("_")[0],
      chq : item.split("_")[1]
    }));

    return chq

    
  };

  // Example action: View selected rows summary
  const handleViewSelected = () => {
    const selectedData = getSelectedRowsData();
    if (selectedData.length === 0) {
      toast.warning('No rows selected');
      return;
    }

    const totalAmount = selectedData.reduce((sum, row) => {
      const amount = parseFloat(row.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    toast.success(
      `Selected ${selectedData.length} row(s) | Total Amount: ${totalAmount.toFixed(2)}`,
      { autoClose: 3000 }
    );
  };

  // Example action: Export selected rows
  const handleExportSelected = () => {
    const selectedData = getSelectedRowsData();
    if (selectedData.length === 0) {
      toast.warning('No rows selected');
      return;
    }

    // Create CSV
    const headers = ['Cheque No.', 'Bank', 'Amount', 'Customer', 'Invoice', 'Status', 'Received Date', 'Cheque Date', 'Realization Date'];
    const csvData = selectedData.map(row => [
      row.chequeNo,
      row.bank,
      row.amount,
      row.customer,
      row.invoice,
      row.status || row.staus,
      row.chqReceivedDate,
      row.realizeDate,
      row.realizationDate
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected_cheques_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedData.length} row(s)`);
  };

  // Example action: Update status for selected rows
  const handleBulkStatusUpdate = async (newStatus) => {
    const selectedData = getSelectedRowsData();
    console.log(selectedData);
    if (selectedData.length === 0) {
      toast.warning('No rows selected');
      return;
    }
    console.log(selectedData)
    for (const row of selectedData) {
        row.status = newStatus;
        row.staus = newStatus;

      const res = await updateDataFunction(`/customerChqRecived/rejectCustomerChq/${row.id}`, row)
      console.log(res)
      
    }
    // Here you would implement your API call to update statuses

toast.success("Chq Rcvd successfully");

    // After successful update, reload data
    await load();
  };

  const columns = [
    { field: 'chequeNo', headerName: 'Cheque no.', width: '130px' },
    { field: 'bank', headerName: 'Bank', width: '140px' },
    { field: 'amount', headerName: 'Amount', width: '110px' },
    { field: 'customer', headerName: 'Customer', width: '200px' },
    { field: 'invoice', headerName: 'Invoice', width: '130px' },
    { field: 'status', headerName: 'Status', width: '130px' },
    { field: 'chqReceivedDate', headerName: 'Received date', width: '130px' },
    { field: 'realizeDate', headerName: 'Cheque date', width: '130px' },
    { field: 'realizationDate', headerName: 'Realization date', width: '140px' },
    { field: 'historyTimeline', headerName: 'Audit trail', width: '120px' },
  ];

  // Pure view helper - status pill styling only (no logic change)
  const getStatusBadgeClasses = (status) => {
    const s = String(status || '').trim().toLowerCase();
    if (s === 'pending') return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ring-1 ring-amber-200';
    if (s === 'received' || s === 'clear') return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200';
    if (s === 'reject' || s === 'bounced' || s === 'bounce' || s === 'returntocustomer') return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 ring-1 ring-rose-200';
    if (s === 'deposit') return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 ring-1 ring-violet-200';
    return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium pd-bg-muted pd-text-body ring-1 ring-gray-200';
  };

  return (
    <div className="w-full flex flex-col pd-bg-surface border pd-border-default border rounded-2xl shadow-sm overflow-hidden flex-1 min-h-[560px]">
      <ToastContainer />

      {/* Visual header bar for the register area */}
      <div className="px-5 pt-4 pb-3 border-b bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
        <div>
          <div className="text-base font-semibold pd-text-body tracking-tight">Customer Cheque Register</div>
          <div className="text-[11px] pd-text-muted">Pending cheques only • Click "Audit trail" to view history</div>
        </div>
        <div className="text-xs px-3 py-1 rounded-full pd-bg-surface border pd-text-muted shadow-sm">
          {rows.length} record{rows.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Filter Controls - refreshed visual */}
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="uppercase tracking-[1px] text-[10px] font-semibold pd-text-muted">Date Range Filter</div>
          <div className="flex-1 h-px pd-bg-muted" />
        </div>
        <div className="flex flex-wrap items-end gap-3 pb-3 border-b">
          <div>
            <label className="block text-xs font-medium pd-text-muted mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border pd-border-default border rounded-lg px-3 py-2 text-sm pd-bg-surface focus:border-[color:var(--pd-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium pd-text-muted mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border pd-border-default border rounded-lg px-3 py-2 text-sm pd-bg-surface focus:border-[color:var(--pd-primary)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => load(startDate, endDate)}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
            >
              Apply Filter
            </button>
            {(startDate || endDate) && (
              <button
                type="button"
                className="px-4 py-2 text-sm pd-text-muted hover:pd-text-body border pd-border-default border hover:pd-bg-muted rounded-xl transition"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div className="ml-auto text-xs pd-text-muted max-w-[220px]">
            Filters apply to both cheque received date and realization dates
          </div>
        </div>
      </div>

      {/* Selection Actions Bar - polished toolbar */}
      {selectedRows.size > 0 && (
        <div className="mx-5 mt-3 rounded-2xl border border-blue-200 pd-bg-muted/70 p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center">
            <div className="text-sm font-semibold text-blue-900 pd-bg-surface px-3 py-1 rounded-xl shadow-sm border border-blue-100">
              {selectedRows.size} selected
            </div>
            <button
              onClick={handleClearSelection}
              className="ml-3 text-xs font-medium px-2.5 py-1 pd-text-primary hover:text-blue-900 hover:bg-white/60 rounded-lg transition"
            >
              Clear selection
            </button>
          </div>

          <div className="flex-1" />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleViewSelected}
              className="px-4 py-1.5 text-sm font-medium pd-bg-surface border border-blue-300 pd-text-primary rounded-xl active:bg-blue-200 transition shadow-sm"
            >
              View Summary
            </button>
            <button
              onClick={handleExportSelected}
              className="px-4 py-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition"
            >
              Export CSV
            </button>

            <div className="pl-1">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusUpdate(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="text-sm border border-blue-200 pd-bg-surface px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                defaultValue=""
              >
                <option value="" disabled>Bulk update status…</option>
                <option value="Received">Mark as Received</option>
                <option value="Reject">Mark as Reject</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Info callout (visual only) */}
      <div className="mx-5 mt-3 mb-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[12px] text-slate-600">
        Leave dates empty to show all customer cheques. Bank shows “—” if not stored on the line.
        Status changes are logged with timestamp and user. Older entries may have limited history.
      </div>

      {/* Custom Table - modernized look */}
      <div className="flex-1 overflow-auto mx-5 mt-3 mb-1 rounded-2xl border pd-border-default border shadow-inner bg-white">
        <table className="min-w-full divide-y divide-[color:var(--pd-border-card)] text-sm">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              {/* Checkbox column header */}
              <th className="px-4 py-3 w-11 bg-slate-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectAll && paginatedRows.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-blue-600 rounded pd-border-default border"
                    title="Select/deselect all on current page"
                  />
                  {rows.length > paginatedRows.length && (
                    <button
                      onClick={handleSelectAllPages}
                      className="text-[10px] font-medium pd-text-primary hover:text-blue-800 underline whitespace-nowrap tracking-wide"
                      title={selectedRows.size === rows.length ? "Deselect all" : "Select all across all pages"}
                    >
                      {selectedRows.size === rows.length ? "CLEAR" : "ALL"}
                    </button>
                  )}
                </div>
              </th>
              {columns.map((col) => (
                <th
                  key={col.field}
                  style={{ width: col.width }}
                  className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider"
                >
                  {col.headerName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="pd-bg-surface divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center">
                  <div className="flex justify-center items-center gap-3 pd-text-muted">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-sm">Loading cheques...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center">
                  <div className="inline-flex flex-col items-center pd-text-muted">
                    <div className="text-3xl mb-1">📭</div>
                    <div className="text-sm">No records found for the current filter</div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <tr 
                    key={row._rowId} 
                    className={`${isEven ? 'bg-white' : 'bg-slate-50/70'} /30 transition-colors`}
                  >
                    {/* Checkbox cell */}
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(getKey(row))}
                        onChange={() => handleRowSelect(row)}
                        className="w-4 h-4 accent-blue-600 rounded pd-border-default border"
                      />
                    </td>
                    <td className="px-4 py-2.5 font-medium pd-text-body tabular-nums tracking-tight">{row.chequeNo}</td>
                    <td className="px-4 py-2.5 pd-text-body">{row.bank}</td>
                    <td className="px-4 py-2.5 text-right font-semibold pd-text-body tabular-nums">
                      {Number.isFinite(parseFloat(row.amount)) 
                        ? parseFloat(row.amount).toLocaleString(undefined, { minimumFractionDigits: 0 }) 
                        : (row.amount || '—')}
                    </td>
                    <td className="px-4 py-2.5 pd-text-body">{row.customer}</td>
                    <td className="px-4 py-2.5 pd-text-muted font-mono text-xs">{row.invoice}</td>
                    <td className="px-4 py-2.5">
                      <span className={getStatusBadgeClasses(row.status)}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 pd-text-muted text-sm">{row.chqReceivedDate}</td>
                    <td className="px-4 py-2.5 pd-text-muted text-sm">{row.realizeDate}</td>
                    <td className="px-4 py-2.5 pd-text-muted text-sm">{row.realizationDate}</td>
                    <td className="px-4 py-2.5">
                      {row.historyTimeline && row.historyTimeline.length > 0 ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg pd-bg-surface border border-blue-200 pd-text-primary hover:border-blue-300 active:pd-bg-muted transition"
                          onClick={() => {
                            setHistoryEntries(row.historyTimeline);
                            setHistoryTitle(
                              `Cheque ${row.chequeNo} · Invoice ${row.invoice}`
                            );
                            setHistoryOpen(true);
                          }}
                        >
                          <span>📜</span>
                          <span>{row.historyTimeline.length} step{row.historyTimeline.length === 1 ? '' : 's'}</span>
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination - refreshed */}
      {!isLoading && rows.length > 0 && (
        <div className="px-5 py-3 bg-slate-50 border-t flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-x-3">
            <span className="pd-text-muted text-xs font-medium">ROWS PER PAGE</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="border pd-border-default border rounded-lg px-3 py-1.5 pd-bg-surface text-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="pd-text-muted text-xs">•</span>
            <span className="font-medium pd-text-body tabular-nums">{rows.length} total</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs pd-text-muted mr-1">
              {currentPage * rowsPerPage + 1}–{Math.min((currentPage + 1) * rowsPerPage, rows.length)} of {rows.length}
            </span>

            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-4 py-1.5 text-sm border pd-border-default border rounded-xl pd-bg-surface disabled:opacity-40 disabled:cursor-not-allowed hover:pd-bg-muted active:pd-bg-muted transition"
            >
              ← Prev
            </button>
            <div className="px-3 py-1 text-xs font-semibold rounded-xl pd-bg-surface border pd-text-body tabular-nums">
              {currentPage + 1} / {Math.max(1, totalPages)}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-4 py-1.5 text-sm border pd-border-default border rounded-xl pd-bg-surface disabled:opacity-40 disabled:cursor-not-allowed hover:pd-bg-muted active:pd-bg-muted transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* History Modal - nice visual timeline */}
      {historyOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center pd-modal-overlay p-4" onClick={() => setHistoryOpen(false)}>
          <div 
            className="pd-bg-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest pd-text-muted">Audit Trail</div>
                <div className="text-lg font-semibold pd-text-body mt-0.5">{historyTitle}</div>
              </div>
              <button 
                onClick={() => setHistoryOpen(false)} 
                className="pd-text-muted hover:pd-text-muted text-2xl leading-none mt-0.5"
              >
                &times;
              </button>
            </div>

            {/* Timeline body */}
            <div className="p-5 max-h-[62vh] overflow-auto bg-white">
              {historyEntries.length === 0 ? (
                <div className="text-sm pd-text-muted py-6 text-center">No history available.</div>
              ) : (
                <div className="relative pl-6">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[17px] top-3 bottom-3 w-px bg-gradient-to-b from-gray-300 via-gray-200 to-transparent" />

                  {historyEntries.map((h, i) => (
                    <div key={i} className="relative mb-5 last:mb-1">
                      {/* Dot */}
                      <div className="absolute -left-[3px] top-1.5 h-3.5 w-3.5 rounded-full pd-bg-surface border-2 border-[color:var(--pd-primary)] shadow" />

                      <div className="pl-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="text-sm font-semibold pd-text-body">
                            {h.at ? String(h.at).slice(0, 19).replace('T', ' ') : '—'}
                          </div>
                          {h.by && (
                            <div className="text-xs pd-text-muted font-medium">{h.by}</div>
                          )}
                        </div>

                        <div className="mt-1 text-sm">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded pd-bg-muted pd-text-muted mr-2 align-middle">
                            {h.fromStatus || '—'}
                          </span>
                          <span className="pd-text-muted mx-1">→</span>
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded pd-bg-muted pd-text-primary align-middle">
                            {h.toStatus || '—'}
                          </span>
                        </div>

                        {h.eventDate && (
                          <div className="mt-1 text-[11px] text-emerald-700">Effective: {h.eventDate}</div>
                        )}
                        {h.note && (
                          <div className="mt-1 text-xs leading-snug pd-text-muted pd-bg-muted border rounded-lg p-2">
                            {h.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t pd-bg-muted flex justify-end">
              <button
                onClick={() => setHistoryOpen(false)}
                className="px-5 py-2 text-sm font-semibold rounded-2xl border pd-border-default border pd-text-body pd-bg-surface hover:pd-bg-muted active:pd-bg-readonly transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerChqRegister;