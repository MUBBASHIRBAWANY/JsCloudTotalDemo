import React, { useEffect, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import AppSelect from '../../Global/AppSelect.jsx'
import 'react-toastify/dist/ReactToastify.css';

/** Extract string ID from MongoDB document (handles {$oid: "..."} format) */
function extractId(doc) {
    if (!doc) return null;
    if (doc.id) return String(doc.id);
    if (doc._id) {
        if (typeof doc._id === 'string') return doc._id;
        if (doc._id.$oid) return doc._id.$oid;
        return String(doc._id);
    }
    return null;
}

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

    for (const doc of docs) {
        const customerName = clientById.get(doc.Customer)?.CutomerName ?? doc.Customer ?? '—';
        const lineChq = doc.chq || '—';
        const lineInv = doc.Invoice || '—';
        const status = doc.status || doc.staus || '—';

        if (status === 'Deposit') {
            const docId = extractId(doc);
            rows.push({
                _rowId: docId || `${lineChq}_${lineInv}`,
                chequeNo: String(lineChq),
                bank: doc.Bank || doc.bank || '—',
                bankId: doc.bankId || null,
                amount: doc.Amount || '',
                customer: customerName,
                invoice: lineInv,
                status: status,
                chqDepositDate: doc.Date || doc.ChqDate || '—',
                realizeDate: doc.RealizeDate || '—',
                realizationDate: doc.RealizationDate || '—',
                _normDeposit: normalizeDate(doc.Date || doc.ChqDate),
                _normRealize: normalizeDate(doc.RealizeDate),
                _normRealization: normalizeDate(doc.RealizationDate),
                historyTimeline: doc.chqStatusHistory || [],
                originalDocId: docId,
                originalDoc: doc,
            });
        }
    }

    return rows;
}

function parseAmount(val) {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : 0;
}

function mergeUniqueValues(existing, next) {
    if (!next || next === '—') return existing;
    if (!existing || existing === '—') return next;
    const parts = String(existing).split(',').map((s) => s.trim());
    if (parts.includes(next)) return existing;
    return `${existing}, ${next}`;
}

/** Merge flat rows by cheque number; keeps chqItems with individual _id, chq, amount */
function mergeRowsByChequeNumber(flatRows) {
    const byChq = new Map();

    for (const row of flatRows) {
        const chqKey = String(row.chequeNo);
        const item = {
            _id: String(row.originalDocId),
            chq: chqKey,
            amount: row.amount,
            originalDoc: row.originalDoc,
        };

        if (!byChq.has(chqKey)) {
            byChq.set(chqKey, {
                _rowId: chqKey,
                chequeNo: chqKey,
                amount: parseAmount(row.amount),
                customer: row.customer,
                invoice: row.invoice,
                status: row.status,
                chqDepositDate: row.chqDepositDate,
                realizeDate: row.realizeDate,
                realizationDate: row.realizationDate,
                _normDeposit: row._normDeposit,
                _normRealize: row._normRealize,
                _normRealization: row._normRealization,
                historyTimeline: [...(row.historyTimeline || [])],
                bank: row.bank,
                bankId: row.bankId,
                chqItems: [item],
            });
            continue;
        }

        const merged = byChq.get(chqKey);
        merged.chqItems.push(item);
        merged.amount += parseAmount(row.amount);
        merged.customer = mergeUniqueValues(merged.customer, row.customer);
        merged.invoice = mergeUniqueValues(merged.invoice, row.invoice);
        merged.historyTimeline = [...merged.historyTimeline, ...(row.historyTimeline || [])];
    }

    return Array.from(byChq.values());
}

/** Group flat chqItems back by cheque number for bulk update */
function mergeItemsByChq(items) {
    const byChq = new Map();

    for (const item of items) {
        const chqKey = String(item.chq);
        const entry = {
            _id: String(item._id),
            chq: chqKey,
            amount: item.amount,
            originalDoc: item.originalDoc,
        };

        if (!byChq.has(chqKey)) {
            byChq.set(chqKey, {
                chq: chqKey,
                amount: parseAmount(item.amount),
                chqItems: [entry],
            });
            continue;
        }

        const merged = byChq.get(chqKey);
        merged.chqItems.push(entry);
        merged.amount += parseAmount(item.amount);
    }

    return Array.from(byChq.values());
}

function inRange(norm, start, end) {
    if (!norm || !start || !end) return false;
    return norm >= start && norm <= end;
}

const CustomerChqBounceAndClear = () => {
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
    const [banks, setBanks] = useState([]);
    const [clientAccount, setclientAccount] = useState('')
    const [date, setdate] = useState(null)
    const [selectedBank, setSelectedBank] = useState(null);

    const [updatingBankFor, setUpdatingBankFor] = useState(null);

    // Checkbox states
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const getData = async () => {
        try {
            const id = "687e14a624a274d5e844be49";
            const res = await getDataFundtion(`/Administrative/get/${id}`);
            const accounts = await getDataFundtion('/ChartofAccounts');
            const BankAccountNumber = res.data;
            setclientAccount(BankAccountNumber.Client)
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
        } catch (err) {
            console.log(err)
        }
    }
    useEffect(() => {
        getData()
    }, [])


    const load = async (startDate, endDate) => {
        setIsLoading(true);
        try {
            const currentDate = new Date().toISOString().split("T")[0];
            const chqRes = await getDataFundtion(`/customerChqRecived/chqReports?startdate=2025-06-01&endDate=${currentDate}&DateType=ChqDate`);

            const flatedChqRes = chqRes.filter((item) => item.staus === "Deposit");
            const flatedChqRes2 = flatedChqRes.filter((item) => item.status === "Deposit");
            console.log(flatedChqRes2)
            const flatedChqRes3 = flatedChqRes2.filter((item) => item.Bank === selectedBank.value);
            const clientRes = await getDataFundtion('/Customer/customerNameid');
            const docs = Array.isArray(flatedChqRes3) ? flatedChqRes3 : flatedChqRes3 ?? [];
            const clients = Array.isArray(clientRes) ? clientRes : clientRes?.data ?? [];
            const clientById = new Map(clients.map((c) => [c._id, c]));
            const flat = flattenRegisterRows(docs, clientById);
            const merged = mergeRowsByChequeNumber(flat);
            setAllRows(merged);
            setRows(merged);
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
                date: date,
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
                const recvOk = inRange(r._normDeposit, startDate, endDate);
                const realizeOk = inRange(r._normRealize, startDate, endDate) ||
                    inRange(r._normRealization, startDate, endDate);
                if (dateMode === 'Deposit') return recvOk;
                if (dateMode === 'realize') return realizeOk;
                return recvOk || realizeOk;
            });
        }

        // Apply bank filter


        return result;
    }, [allRows, startDate, endDate, dateMode]);

    useEffect(() => {
        setRows(filtered);
        setCurrentPage(0);
        setSelectedRows(new Set());
        setSelectAll(false);
    }, [filtered]);

    const paginatedRows = useMemo(() => {
        const start = currentPage * rowsPerPage;
        const end = start + rowsPerPage;
        return rows.slice(start, end);
    }, [rows, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(rows.length / rowsPerPage);
    const getKey = (row) => row.chequeNo;

    const isRowSelected = (row) => selectedRows.has(getKey(row));

    const allPageSelected =
        paginatedRows.length > 0 && paginatedRows.every((row) => isRowSelected(row));

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
            if (allPageSelected) {
                paginatedRows.forEach((row) => next.delete(getKey(row)));
            } else {
                paginatedRows.forEach((row) => next.add(getKey(row)));
            }
            return next;
        });
        setSelectAll(!allPageSelected);
    };

    const handleSelectAllPages = () => {
        const allKeys = rows.map((row) => getKey(row));
        const allSelected = allKeys.length > 0 && allKeys.every((key) => selectedRows.has(key));
        if (allSelected) {
            setSelectedRows(new Set());
            setSelectAll(false);
        } else {
            setSelectedRows(new Set(allKeys));
            setSelectAll(true);
        }
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
        if (date == null) {
            return toast.error("first Select Date")
        }
        const selectedData = getSelectedRowsData();
        if (selectedData.length === 0) {
            toast.warning('No rows selected');
            return;
        }

        const itemsToUpdate = mergeItemsByChq(
            selectedData.flatMap((row) => row.chqItems || [])
        );
        const totalRecords = itemsToUpdate.reduce((sum, g) => sum + g.chqItems.length, 0);
        toast.info(`Updating ${itemsToUpdate.length} cheque(s) (${totalRecords} record(s))...`);

        if (newStatus === "Clear") {
            for (const group of itemsToUpdate) {
                try {
                    const updatePayload = {
                        chq: group.chq,
                        id: group.chqItems[0]._id,
                        Amount: group.amount,
                        status: newStatus,
                        Date: date,
                        staus: newStatus,
                        Customer: group.chqItems[0].originalDoc.Customer,
                        Store: group.chqItems[0].originalDoc.Store,
                        Bank: selectedBank?.value || "",
                        chqItems: group.chqItems,
                    };
                    await updateDataFunction(`/customerChqRecived/rejectCustomerChq/cleare`, updatePayload);
                } catch (error) {
                    console.error(`Error updating cheque ${group.chq}:`, error);
                    toast.error(`Error updating cheque ${group.chq}: ${error?.response?.data?.message || error.message}`);
                }
            }
            toast.success(`Updated ${itemsToUpdate.length} cheque(s) to ${newStatus}`);
            await load(startDate, endDate);
        } else {
            for (const group of itemsToUpdate) {
                try {
                    const updatePayload = {
                        status: newStatus,
                        Date: date,
                        staus: newStatus,
                        Bank: selectedBank?.value || "",
                        chqItems: group.chqItems,
                    };
                    console.log(updatePayload)
                     await updateDataFunction(`/customerChqRecived/rejectCustomerChq/Bounce`, updatePayload);
                } catch (error) {
                    console.error(`Error updating cheque ${group.chq}:`, error);
                    toast.error(`Error updating cheque ${group.chq}: ${error?.response?.data?.message || error.message}`);
                }
            }
            toast.success(`Updated ${itemsToUpdate.length} cheque(s) to ${newStatus}`);
            await load(startDate, endDate);
        }
    };
    const handleExportSelected = () => {
        const selectedData = getSelectedRowsData();
        if (selectedData.length === 0) {
            toast.warning('No rows selected');
            return;
        }

        const headers = ['Cheque No.', 'Amount', 'Customer', 'Invoice', 'Status', 'Deposit Date', 'Cheque Date', 'Realization Date'];
        const csvData = selectedData.map(row => [
            row.chequeNo,
            row.bank,
            row.amount,
            row.customer,
            row.invoice,
            row.status,
            row.chqDepositDate,
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
        { field: 'chqDepositDate', headerName: 'Deposit Date', width: '150px' },
        { field: 'realizeDate', headerName: 'Cheque Date', width: '150px' },
        { field: 'realizationDate', headerName: 'Realization Date', width: '170px' },
        { field: 'historyTimeline', headerName: 'Audit Trail', width: '130px' },
    ];

    return (
        <div className="h-[calc(100vh-3.5rem)] w-full flex flex-col pd-bg-muted rounded-lg p-4">
            <ToastContainer position="top-right" autoClose={3000} />

            {/* Header */}
            <div className="mb-4">
                <h2 className="pd-page-title">Cheque Deposit Management</h2>
                <p className="text-sm pd-text-muted mt-1">Manage and track customer cheque deposits</p>
            </div>

            {/* Filter Controls */}
            <div className="pd-bg-surface rounded-lg shadow-sm border pd-border-default border p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

                    <div>
                        <label className="block text-xs font-medium pd-text-body mb-1">Select bank</label>
                        <AppSelect
                            onChange={(e) => setSelectedBank(e)}
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
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-4 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-blue-900">
                            📋 {selectedRows.size} row(s) selected
                        </span>
                        <div>
                            <input type="date" onChange={(e) => setdate(e.target.value)} />
                        </div>
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
                            <option value="Clear">Clear</option>
                            <option value="Bounce">Bounce</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto pd-bg-surface rounded-lg shadow-sm border pd-border-default border">
                <table className="min-w-full divide-y divide-[color:var(--pd-border-card)] text-base">
                    <thead className="pd-bg-muted sticky top-0 z-10">
                        <tr>
                            <th className="px-5 py-4 w-14">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={allPageSelected}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 pd-text-primary rounded pd-border-default border"
                                    />
                                    {rows.length > paginatedRows.length && (
                                        <button
                                            onClick={handleSelectAllPages}
                                            className="text-xs pd-text-primary hover:text-blue-800 underline whitespace-nowrap"
                                        >
                                            {selectedRows.size === rows.length ? "Clear all" : "All pages"}
                                        </button>
                                    )}
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
                        ) : paginatedRows.length === 0 ? (
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
                            paginatedRows.map((row) => (
                                <tr key={row._rowId} className="hover:pd-bg-muted transition duration-150">
                                    <td className="px-5 py-4">
                                        <input
                                            type="checkbox"
                                            checked={isRowSelected(row)}
                                            onChange={() => handleRowSelect(row)}
                                            className="w-4 h-4 pd-text-primary rounded pd-border-default border"
                                        />
                                    </td>
                                    <td className="px-5 py-4 font-medium pd-text-body">
                                        {row.chequeNo}
                                        {row.chqItems?.length > 1 && (
                                            <span className="ml-2 text-xs pd-text-muted">({row.chqItems.length} records)</span>
                                        )}
                                    </td>

                                    <td className="px-5 py-4 pd-text-body font-medium">
                                        {Number.isFinite(row.amount) ?
                                            new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(row.amount) :
                                            row.amount || '—'}
                                    </td>
                                    <td className="px-5 py-4 pd-text-body">{row.customer}</td>
                                    <td className="px-5 py-4 pd-text-body">{row.invoice}</td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.status === 'Deposit' ? 'bg-green-100 text-green-800' :
                                            row.status === 'Reject' ? 'bg-red-100 text-red-800' :
                                                'pd-bg-muted pd-text-body'
                                            }`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 pd-text-muted">{row.chqDepositDate}</td>
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

            {/* Pagination */}
            {!isLoading && rows.length > 0 && (
                <div className="flex justify-between items-center mt-4 pd-bg-surface px-4 py-3 rounded-lg shadow-sm border pd-border-default border">
                    <div className="flex items-center gap-3">
                        <span className="text-sm pd-text-muted">Rows per page:</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setCurrentPage(0);
                            }}
                            className="border pd-border-default border rounded-lg px-2 py-1 text-sm"
                        >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm pd-text-muted">
                            Showing {currentPage * rowsPerPage + 1} - {Math.min((currentPage + 1) * rowsPerPage, rows.length)} of {rows.length}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                disabled={currentPage === 0}
                                className="px-3 py-1 text-sm border pd-border-default border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:pd-bg-muted transition"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                                disabled={currentPage === totalPages - 1}
                                className="px-3 py-1 text-sm border pd-border-default border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:pd-bg-muted transition"
                            >
                                Next
                            </button>
                        </div>
                    </div>
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

export default CustomerChqBounceAndClear;