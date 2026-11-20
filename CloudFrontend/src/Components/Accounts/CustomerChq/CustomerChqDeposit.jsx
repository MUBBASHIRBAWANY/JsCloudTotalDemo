import React, { useEffect, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import AppSelect from '../../Global/AppSelect.jsx'
import 'react-toastify/dist/ReactToastify.css';

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

function flattenRegisterRows(docs, clientById) {
    const rows = [];

    for (let idx = 0; idx < docs.length; idx++) {
        const doc = docs[idx];
        const customerName = clientById.get(doc.Customer)?.CutomerName ?? doc.Customer ?? '—';
        const lineChq = doc.chq || '—';
        const lineInv = doc.Invoice || '—';
        const status = doc.status || doc.staus || '—';

        if (status === 'Received') {
            rows.push({
                _rowId: `${doc._id || doc.id}_${lineChq}_${lineInv}_${idx}`,
                chequeNo: String(lineChq),
                bank: doc.Bank || doc.bank || '—',
                bankId: doc.bankId || null,
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
                originalDocId: String(doc._id || doc.id || idx),
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

const CustomerChqDeposit = () => {
    const [allRows, setAllRows] = useState([]);
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [dateMode, setDateMode] = useState('either');
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyEntries, setHistoryEntries] = useState([]);
    const [historyTitle, setHistoryTitle] = useState('');
    const [banks, setBanks] = useState([]);

    const [selectedBank, setSelectedBank] = useState(null);
    const [updatingBankFor, setUpdatingBankFor] = useState(null);

    // Checkbox states
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);

    const load = async (startDate, endDate) => {
        setIsLoading(true);
        try {
            const id = "687e14a624a274d5e844be49";
            const res = await getDataFundtion(`/Administrative/get/${id}`);
            const accounts = await getDataFundtion('/ChartofAccounts');
            const BankAccountNumber = res.data;
            const accountsRes = accounts.data.filter((item) => item.AccountCode.length > 5);
            const result = [];
            for (let i = BankAccountNumber.BankAccountFrom; i <= BankAccountNumber.BankAccountTo; i++) {
                result.push(i.toString().padStart(5, '0'));
            }
            const Bank = accountsRes.filter((item) => result.some(prefix => item.AccountCode.startsWith(prefix)));

            const allBanks = Bank.map((item) => ({
                value: item._id,
                label: item.AccountName
            }));
            setBanks(allBanks);
const currentDate = new Date().toISOString().split("T")[0];
            const chqRes = await getDataFundtion(`/customerChqRecived/chqReports?startdate=2025-06-01&endDate=${currentDate}&DateType=ChqDate`);
            const flatedChqRes = chqRes.filter((item) => item.staus === "Received");
            const flatedChqRes2 = flatedChqRes.filter((item) => item.status === "Received");
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

    const handleBankUpdate = async (row, selectedOption) => {
        if (!selectedOption) return;

        setUpdatingBankFor(row._rowId);

        try {
            const originalDoc = row.originalDoc;
            const updatePayload = {
                ...originalDoc,
                Bank: selectedOption.label,
                bank: selectedOption.label,
                bankId: selectedOption.value
            };
console.log(updatePayload)
            const response = await updateDataFunction(
                `/customerChqRecived/updateBank/${row.originalDocId}`,
                updatePayload
            );

            if (response.success || response.ok || response.status === 200) {
                toast.success(`Bank updated to ${selectedOption.label} for cheque ${row.chequeNo}`);

                const updateRowInList = (rowsList) =>
                    rowsList.map(r =>
                        r._rowId === row._rowId
                            ? { ...r, bank: selectedOption.label, bankId: selectedOption.value }
                            : r
                    );

                setAllRows(updateRowInList);
                setRows(updateRowInList);
            } else {
                toast.error('Failed to update bank');
            }
        } catch (error) {
            console.error('Error updating bank:', error);
            toast.error('Failed to update bank');
        } finally {
            setUpdatingBankFor(null);
        }
    };

    const filtered = useMemo(() => {
        let result = allRows;

        // Apply date filter
        if (startDate && endDate) {
            result = result.filter((r) => {
                const recvOk = inRange(r._normReceived, startDate, endDate);
                const realizeOk = inRange(r._normRealize, startDate, endDate) ||
                    inRange(r._normRealization, startDate, endDate);
                if (dateMode === 'received') return recvOk;
                if (dateMode === 'realize') return realizeOk;
                return recvOk || realizeOk;
            });
        }

        // Apply bank filter
       

        return result;
    }, [allRows, startDate, endDate, dateMode]);

    useEffect(() => {
        load(startDate, endDate);
    }, []);

    useEffect(() => {
        setRows(filtered);
        setSelectedRows(new Set());
        setSelectAll(false);
    }, [filtered]);

    const getKey = (row) => `${row.originalDocId}_${row.chequeNo}`;

    const isRowSelected = (row) => selectedRows.has(getKey(row));

    const allRowsSelected =
        rows.length > 0 && rows.every((row) => isRowSelected(row));

    const handleRowSelect = (row) => {
        const key = getKey(row);
        setSelectedRows((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        setSelectedRows((prev) => {
            const next = new Set(prev);
            if (allRowsSelected) {
                rows.forEach((row) => next.delete(getKey(row)));
            } else {
                rows.forEach((row) => next.add(getKey(row)));
            }
            return next;
        });
        setSelectAll(!allRowsSelected);
    };

    const handleClearSelection = () => {
        setSelectedRows(new Set());
        setSelectAll(false);
        toast.info('Selection cleared');
    };

    const getSelectedRowsData = () => {
        const selectedData = [];
        for (const key of selectedRows) {
            const row = rows.find(r => getKey(r) === key);
            if (row) {
                selectedData.push(row);
            }
        }
        return selectedData;
    };

    const handleBulkStatusUpdate = async (newStatus) => {
        const selectedData = getSelectedRowsData();
        if (selectedData.length === 0) {
            toast.warning('No rows selected');
            return;
        }

        toast.info(`Updating ${selectedData.length} cheque(s)...`);
if(selectedBank !== null){
     for (const row of selectedData) {
            try {
                const originalDoc = row.originalDoc;
                console.log(newStatus)
                const updatePayload = {
                    ...originalDoc,
                    status: newStatus,
                    staus: newStatus,
                    Bank : selectedBank?.value || ""
                };

             await updateDataFunction(`/customerChqRecived/rejectCustomerChq/${row.originalDocId}`, updatePayload);
            } catch (error) {
                console.error(`Error updating cheque ${row.chequeNo}:`, error);
            }
            toast.success(`Updated ${selectedData.length} cheque(s) to ${newStatus}`);
        await load(startDate, endDate);
        }

        
}
else{
    toast.error("Select Bank")
}
       
    };

    const handleExportSelected = () => {
        const selectedData = getSelectedRowsData();
        if (selectedData.length === 0) {
            toast.warning('No rows selected');
            return;
        }

        const headers = ['Cheque No.',  'Amount', 'Customer', 'Invoice', 'Status', 'Received Date', 'Cheque Date', 'Realization Date'];
        const csvData = selectedData.map(row => [
            row.chequeNo,
            row.bank,
            row.amount,
            row.customer,
            row.invoice,
            row.status,
            row.chqReceivedDate,
            row.realizeDate,
            row.realizationDate
        ]);

        const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cheques_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${selectedData.length} row(s)`);
    };

    const columns = [
        { field: 'chequeNo', headerName: 'Cheque No.', width: '160px' },
        { field: 'amount', headerName: 'Amount', width: '150px' },
        { field: 'customer', headerName: 'Customer', width: '280px' },
        { field: 'invoice', headerName: 'Invoice', width: '160px' },
        { field: 'status', headerName: 'Status', width: '140px' },
        { field: 'chqReceivedDate', headerName: 'Received Date', width: '150px' },
        { field: 'realizeDate', headerName: 'Cheque Date', width: '150px' },
        { field: 'realizationDate', headerName: 'Realization Date', width: '170px' },
        { field: 'historyTimeline', headerName: 'Audit Trail', width: '130px' },
    ];

    return (
        <div className="h-[calc(100vh-3.5rem)] w-full flex flex-col pd-bg-muted rounded-lg p-2">
            <ToastContainer position="top-right" autoClose={3000} />

            {/* Header */}
            <div className="mb-2 shrink-0">
                <h2 className="pd-page-title text-lg leading-tight">Cheque Deposit Management</h2>
                <p className="text-xs pd-text-muted">Manage and track customer cheque deposits</p>
            </div>

            {/* Filter Controls */}
            <div className="pd-bg-surface rounded-lg shadow-sm border pd-border-default border p-3 mb-2 shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    
                    <div>
                        <label className="block text-xs font-medium pd-text-body mb-1">Select bank</label>
                        <AppSelect
                            onChange={(e)=> setSelectedBank(e)}
                            options={banks}
                            value={selectedBank}
                            isClearable
                            placeholder="All Banks"
                            compact
                            classNamePrefix="pd-select"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => load(startDate, endDate)}
                            className="pd-btn-save w-full transition duration-200 ease-in-out transform hover:scale-105"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
                {(startDate || endDate) && (
                    <div className="mt-3 flex justify-end">
                        <button
                            onClick={() => {
                                setStartDate('');
                                setEndDate('');
                                load('', '');
                            }}
                            className="text-sm pd-text-primary hover:text-blue-800 underline"
                        >
                            Clear All Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Selection Actions Bar */}
            {selectedRows.size > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2 mb-2 shrink-0 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-blue-900">
                            📋 {selectedRows.size} row(s) selected
                        </span>
                        <button
                            onClick={handleClearSelection}
                            className="text-xs pd-text-primary hover:text-blue-800 underline"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleExportSelected}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 flex items-center gap-1"
                        >
                            📊 Export CSV
                        </button>
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    handleBulkStatusUpdate(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="px-3 py-1.5 text-sm border pd-border-default border rounded-lg pd-bg-surface"
                            defaultValue=""
                        >
                            <option value="" disabled>Bulk Update Status</option>
                            <option value="Deposit">Deposit</option>
                            <option value="ReturntoCustomer">Return to Customer</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 min-h-[78vh] overflow-auto pd-bg-surface rounded-lg shadow-sm border pd-border-default border">
                <table className="min-w-full divide-y divide-[color:var(--pd-border-card)] text-base">
                    <thead className="pd-bg-muted sticky top-0 z-10">
                        <tr>
                            <th className="px-5 py-4 w-14">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={allRowsSelected}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 pd-text-primary rounded pd-border-default border"
                                    />
                                </div>
                            </th>
                            {columns.map((col) => (
                                <th
                                    key={col.field}
                                    style={{ width: col.width }}
                                    className="px-5 py-4 text-left text-sm font-semibold pd-text-muted uppercase tracking-wider"
                                >
                                    {col.headerName}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="pd-bg-surface divide-y divide-[color:var(--pd-border-card)]">
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-4 py-12 text-center">
                                    <div className="flex justify-center items-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                                    </div>
                                    <p className="mt-2 text-sm pd-text-muted">Loading cheques...</p>
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-4 py-12 text-center">
                                    <div className="pd-text-muted">
                                        <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                        <p className="mt-2 text-sm">No records found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row._rowId} className="hover:pd-bg-muted transition duration-150">
                                    <td className="px-5 py-4">
                                        <input
                                            type="checkbox"
                                            checked={isRowSelected(row)}
                                            onChange={() => handleRowSelect(row)}
                                            className="w-4 h-4 pd-text-primary rounded pd-border-default border"
                                        />
                                    </td>
                                    <td className="px-5 py-4 font-medium pd-text-body">{row.chequeNo}</td>
                                    
                                    <td className="px-5 py-4 pd-text-body font-medium">
                                        {Number.isFinite(parseFloat(row.amount)) ?
                                            new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(parseFloat(row.amount)) :
                                            row.amount || '—'}
                                    </td>
                                    <td className="px-5 py-4 pd-text-body">{row.customer}</td>
                                    <td className="px-5 py-4 pd-text-body">{row.invoice}</td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.status === 'Received' ? 'bg-green-100 text-green-800' :
                                                row.status === 'Reject' ? 'bg-red-100 text-red-800' :
                                                    'pd-bg-muted pd-text-body'
                                            }`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 pd-text-muted">{row.chqReceivedDate}</td>
                                    <td className="px-5 py-4 pd-text-muted">{row.realizeDate}</td>
                                    <td className="px-5 py-4 pd-text-muted">{row.realizationDate}</td>
                                    <td className="px-5 py-4">
                                        {row.historyTimeline && row.historyTimeline.length > 0 ? (
                                            <button
                                                onClick={() => {
                                                    setHistoryEntries(row.historyTimeline);
                                                    setHistoryTitle(`Cheque ${row.chequeNo} · ${row.invoice}`);
                                                    setHistoryOpen(true);
                                                }}
                                                className="pd-text-primary hover:text-blue-800 text-sm font-medium underline flex items-center gap-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {row.historyTimeline.length} step{row.historyTimeline.length === 1 ? '' : 's'}
                                            </button>
                                        ) : (
                                            <span className="pd-text-muted text-sm">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {!isLoading && rows.length > 0 && (
                <div className="mt-2 shrink-0 text-sm pd-text-muted text-right px-1">
                    Total {rows.length} record{rows.length === 1 ? '' : 's'}
                </div>
            )}

            {/* History Modal */}
            {historyOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 pd-modal-overlay transition-opacity" onClick={() => setHistoryOpen(false)}></div>
                        <div className="relative pd-bg-surface rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col transform transition-all">
                            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
                                <h3 className="text-lg font-semibold pd-text-body">
                                    📜 Cheque History — {historyTitle}
                                </h3>
                            </div>
                            <div className="px-6 py-4 overflow-y-auto flex-1">
                                {historyEntries.length === 0 ? (
                                    <p className="pd-text-muted text-center py-4">No history available</p>
                                ) : (
                                    <div className="space-y-3">
                                        {historyEntries.map((h, i) => (
                                            <div key={i} className="border-l-4 border-blue-400 pl-3 py-2">
                                                <div className="flex items-center gap-2 text-xs pd-text-muted mb-1">
                                                    <span>📅 {h.at ? String(h.at).slice(0, 19).replace('T', ' ') : '—'}</span>
                                                    {h.by && <span>👤 {h.by}</span>}
                                                </div>
                                                <div className="text-sm font-medium pd-text-body">
                                                    {h.fromStatus || '—'} → {h.toStatus || '—'}
                                                </div>
                                                {h.eventDate && (
                                                    <div className="text-xs pd-text-muted mt-1">Effect date: {h.eventDate}</div>
                                                )}
                                                {h.note && <div className="text-xs pd-text-muted mt-1 italic">{h.note}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="px-6 py-4 border-t pd-bg-muted rounded-b-xl flex justify-end">
                                <button
                                    onClick={() => setHistoryOpen(false)}
                                    className="px-4 py-2 text-sm font-medium pd-text-body pd-bg-surface border pd-border-default border rounded-lg hover:pd-bg-muted transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerChqDeposit;