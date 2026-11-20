import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import AppSelect from '../../Global/AppSelect.jsx';
import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchChartofAccounts } from '../../../Redux/Reducers/ChartofAccountsReduser';
import { fetchAdminReducer } from '../../../Redux/Reducers/AdminReducer';
import { fetchVoucher } from '../../../Redux/Reducers/VoucherReducer';
import { fetchClient } from '../../../Redux/Reducers/ClientReducer';
import { fetchDistributroReducers } from '../../../Redux/Reducers/DistributroReducers';
import { fetchOpeningInvoices } from '../../../Redux/Reducers/OpeningInvoicesReducer';
import GlobalLoader from '../../Global/GlobalLoader.jsx';
import { formatAmount } from '../../../utils/amountToWords.js';

const InvoiceAdjust = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer);
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher);
    const Distributor = useSelector((state) => state.DistributroReducers.DistributroReducers);
    const Customer = useSelector((state) => state.Client.client);
    const OpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);
    const SoftStore = useSelector((state) => state.Store.Store);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mainAc, setMainAc] = useState('');
    const [remarks, setRemarks] = useState('');
    const [ref, setRef] = useState('');
    const [rows, setRows] = useState([]);

    const { register, handleSubmit, reset } = useForm();

    const adminId = '687e14a624a274d5e844be49';

    // Store map for display
    const storeMap = useMemo(() => {
        const map = {};
        [{ _id: '0', StoreName: 'Head Office' }, ...(SoftStore || [])].forEach((s) => {
            map[s._id] = s.StoreName;
        });
        return map;
    }, [SoftStore]);

    // Combined Customer options
    const AllClient = useMemo(() => [
        ...(Distributor || []).map((item) => ({
            label: `${item.DistrbutorName} (Distributor)`,
            value: item._id,
            type: 'Distributor'
        })),
        ...(Customer?.data || []).map((item) => ({
            label: `${item.CutomerName || item.Client} ${item.SalesFlowRef ? `(${item.SalesFlowRef})` : ''} (Customer)`,
            value: item._id,
            type: 'Customer'
        }))
    ], [Distributor, Customer]);

    const loadClientOptions = async (inputValue) => {
        if (!inputValue) return AllClient.slice(0, 50);
        return AllClient
            .filter((item) => item.label.toLowerCase().includes(inputValue.toLowerCase()))
            .slice(0, 50);
    };

    // Only Advance + Loan accounts for debit
    const accountOptions = useMemo(() => (Accounts || [])
        .filter((item) => (item.AccountCode || '').length > 5)
        .map((Ac) => ({
            label: `${Ac.AccountName} ${Ac.AccountCode}`,
            value: Ac._id,
        })), [Accounts]);

    const mainAccountOptions = useMemo(() => {
        const opts = [];
        if (Admin?.advance) {
            opts.push(accountOptions.find((a) => a.value === Admin.advance) || {
                label: 'Advance Account',
                value: Admin.advance,
            });
        }
        if (Admin?.loan) {
            opts.push(accountOptions.find((a) => a.value === Admin.loan) || {
                label: 'Loan Account',
                value: Admin.loan,
            });
        }
        return opts;
    }, [Admin, accountOptions]);

    const otherAc = useMemo(
        () => mainAccountOptions.find((o) => o.value !== mainAc)?.value || '',
        [mainAccountOptions, mainAc]
    );

    const getRemainingAmount = (item) =>
        Number(item?.RemaingAmount ?? item?.Remaining ?? item?.RemainingAmount ?? 0);

    // Fetch dependencies on mount
    useEffect(() => {
        const loadAll = async () => {
            try {
                const [adminRes, accountsRes, customerRes, distributorRes, openingRes] = await Promise.all([
                    getDataFundtion(`/Administrative/get/${adminId}`),
                    getDataFundtion('/ChartofAccounts'),
                    getDataFundtion('/Customer'),
                    getDataFundtion('/Distrbutor'),
                    getDataFundtion('/OpeningInvoice/onlyRemain'),
                ]);
                dispatch(fetchAdminReducer(adminRes.data));
                dispatch(fetchChartofAccounts(accountsRes.data || []));
                dispatch(fetchClient(customerRes));
                dispatch(fetchDistributroReducers(distributorRes));
                dispatch(fetchOpeningInvoices(openingRes.data || []));
                if (!EditVoucher || EditVoucher.length === 0) {
                    const data = await getDataFundtion('/Voucher?&VoucherType=JV');
                    dispatch(fetchVoucher(data.data || []));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
        reset({ VoucherDate: new Date().toISOString().split('T')[0] });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    // Default to Advance account
    useEffect(() => {
        if (Admin?.advance && !mainAc) setMainAc(Admin.advance);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Admin]);

    // Add new empty row
    const addRow = useCallback(() => {
        setRows((prev) => [
            ...prev,
            {
                id: Date.now(),
                client: null,       // selected client option
                invoices: [],       // all invoices for this client
                invDrp: [],         // dropdown options
                selectedInvoice: null,
                amount: 0,
                store: '',
                type: '',
                loading: false,
            }
        ]);
    }, []);

    // Remove a row
    const removeRow = useCallback((id) => {
        setRows((prev) => prev.filter((row) => row.id !== id));
    }, []);

    // Update a row field
    const updateRow = useCallback((id, field, value) => {
        setRows((prev) =>
            prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
        );
    }, []);

    // When Customer is selected in a row → fetch invoices and populate InvRef dropdown
    const handleRowClientSelect = useCallback(async (rowId, clientOption) => {
        // Reset row fields
        setRows((prev) =>
            prev.map((row) =>
                row.id === rowId
                    ? {
                        ...row,
                        client: clientOption,
                        invoices: [],
                        invDrp: [],
                        selectedInvoice: null,
                        amount: 0,
                        store: '',
                        type: '',
                    }
                    : row
            )
        );

        if (!clientOption) return;

        // Set loading for this row
        setRows((prev) =>
            prev.map((row) => (row.id === rowId ? { ...row, loading: true } : row))
        );

        try {
            let invoices = [];
            if (clientOption.type === 'Customer') {
                const res = await getDataFundtion(`/SaleInvoice/getRemainOnlyByCustomer/${clientOption.value}`);
                invoices = (res?.data || []).filter((item) => getRemainingAmount(item) > 0);
            } else {
                const res = await getDataFundtion(`/DistrbutorInvoice/getRemainOnlyByClinet/${clientOption.value}`);
                invoices = (res?.data || []).filter((item) => getRemainingAmount(item) > 0);
            }

            // Opening invoices for this client
            const opening = (OpeningInvoices || []).filter(
                (item) => (item.Client === clientOption.value || item.Distrbutor === clientOption.value)
                    && getRemainingAmount(item) > 0
            );

            const all = [...invoices];
console.log(all)
            // Build InvRef dropdown options
            const DrpCutInv = all.map((item) => ({
                label: `${item.SalesInvoice || item.DitributorInvoiceCode || ''}  ${item.SalesFlowRef || ''} || ${item.Invoice || ''}`,
                value: item.SalesInvoice || item.DitributorInvoiceCode || item.Invoice,
            }));

            setRows((prev) =>
                prev.map((row) =>
                    row.id === rowId
                        ? { ...row, invoices: all, invDrp: DrpCutInv, loading: false }
                        : row
                )
            );

            if (DrpCutInv.length === 0) {
                toast.info(`No remaining invoices for ${clientOption.label}`);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load invoices');
            setRows((prev) =>
                prev.map((row) => (row.id === rowId ? { ...row, loading: false } : row))
            );
        }
    }, [OpeningInvoices]);

    // When Invoice is selected in a row → auto-fill amount and store
    const handleRowInvoiceSelect = useCallback((rowId, invoiceOption) => {
        if (!invoiceOption) {
            setRows((prev) =>
                prev.map((row) =>
                    row.id === rowId
                        ? { ...row, selectedInvoice: null, amount: 0, store: '', type: '' }
                        : row
                )
            );
            return;
        }

        setRows((prev) =>
            prev.map((row) => {
                if (row.id !== rowId) return row;
                const found = row.invoices.find(
                    (item) => (item.SalesInvoice === invoiceOption.value
                        || item.DitributorInvoiceCode === invoiceOption.value
                        || item.Invoice === invoiceOption.value)
                );
                if (!found) return row;
                return {
                    ...row,
                    selectedInvoice: invoiceOption,
                    amount: getRemainingAmount(found),
                    store: found.Store || found.store || '',
                    type: found.Invoice ? 'Opening' : 'Current',
                };
            })
        );
    }, []);

    // Total amount of all rows
    const totalAmount = useMemo(
        () => rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
        [rows]
    );

    const onSubmit = async (data) => {
        if (rows.length === 0) {
            return toast.error('Please add at least one row');
        }
        if (!mainAc) {
            return toast.error('Please select a Debit Account');
        }
        if (!Admin?.Client) {
            return toast.error('Client account is not configured in Administrative settings');
        }

        // Validate all rows
        for (const row of rows) {
            if (!row.client) {
                return toast.error('Please select a Customer in all rows');
            }
            if (!row.selectedInvoice) {
                return toast.error(`Please select an Invoice for ${row.client.label}`);
            }
            if (!row.amount || row.amount <= 0) {
                return toast.error(`Amount must be greater than 0 for ${row.client.label}`);
            }
        }

        if (totalAmount <= 0) {
            return toast.error('Total amount must be greater than 0');
        }

        try {
            setSaving(true);

            // Generate next JV voucher number
            const voucherType = 'JV';
            const date = new Date(data.VoucherDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const prefix = `${voucherType}${year}${month}`;

            const code = await createDataFunction(
                `/Voucher/GetLastVouherByDate/${voucherType}?Voucherdate=${data.VoucherDate}`,
                { prefix: prefix }
            );

            let serial = 1;
            if (code && code.length > 0) {
                const lastVoucher = code[0]?.VoucherNumber;
                if (lastVoucher && lastVoucher.startsWith(prefix)) {
                    const lastSerial = parseInt(lastVoucher.slice(8), 10);
                    serial = isNaN(lastSerial) ? 1 : lastSerial + 1;
                }
            }

            // Build VoucharData: 1 debit row + N credit rows
            const debitRow = {
                id: Date.now(),
                Account: mainAc,
                Debit: totalAmount,
                Credit: 0,
                Narration: remarks || '',
            };

            const creditRows = rows.map((row, idx) => ({
                id: Date.now() + idx + 1,
                Account: Admin?.Client,
                Client: row.client.value,
                ClientRef2: row.selectedInvoice.value,
                Debit: 0,
                Credit: Number(row.amount),
                Narration: remarks || '',
                Type: row.type,
                store: row.store,
                ClientLine: 'true',
            }));

            const VoucharData = [debitRow, ...creditRows];

            const invoiceData = rows.map((row) => ({
                amount: Number(row.amount),
                inv: row.selectedInvoice.value,
                store: row.store,
            }));

            const voucherData = {
                VoucherType: voucherType,
                VoucherNumber: `${prefix}${String(serial).padStart(4, '0')}`,
                VoucherDate: data.VoucherDate,
                Remarks: remarks || '',
                Ref: ref,
                VoucharData: VoucharData,
                invoiceData: invoiceData,
                TotalDebit: totalAmount,
                TotalCredit: totalAmount,
                status: 'Post',
            };

            const res = await createDataFunction('/Voucher', voucherData);
            toast.success('Invoice Adjust Voucher Created Successfully');

            try {
                const allData = await getDataFundtion('/Voucher?&VoucherType=JV');
                dispatch(fetchVoucher(allData.data || []));
            } catch (refreshErr) {
                console.error(refreshErr);
            }

            setTimeout(() => {
                navigate(`/JournalVoucherView/${res.voucher._id}`);
            }, 1500);
        } catch (err) {
            console.error(err);
            toast.error('Something went wrong');
            setSaving(false);
        }
    };

    const mainLabel = mainAccountOptions.find((a) => a.value === mainAc)?.label || '';

    return (
        <div className="p-4">
            <GlobalLoader loading={loading} message="Loading Invoice Adjust..." />
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Invoice Adjust</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
                {/* Header fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Voucher Date </label>
                        <input
                            type="date"
                            style={{ height: '38px' }}
                            {...register('VoucherDate', { required: true })}
                            className="pd-input text-sm md:text-base"
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Debit Account </label>
                        <AppSelect
                            options={mainAccountOptions}
                            value={mainAccountOptions.find((a) => a.value === mainAc) || null}
                            onChange={(e) => setMainAc(e.value)}
                            isSearchable
                            placeholder="Select Account..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Ref </label>
                        <input
                            type="text"
                            value={ref}
                            onChange={(e) => setRef(e.target.value)}
                            style={{ height: '38px' }}
                            className="pd-input text-sm md:text-base"
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Remarks </label>
                        <input
                            type="text"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            style={{ height: '38px' }}
                            className="pd-input text-sm md:text-base"
                        />
                    </div>
                </div>

                {/* Rows table */}
                <div className="overflow-x-auto mb-4">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr className="pd-bg-muted">
                                <th className="border p-2" style={{ width: '22vw' }}>Customer</th>
                                <th className="border p-2" style={{ width: '15vw' }}>InvRef</th>
                                <th className="border p-2" style={{ width: '8vw' }}>Store</th>
                                <th className="border p-2" style={{ width: '10vw' }}>Amount</th>
                                <th className="border p-2" style={{ width: '6vw' }}>Type</th>
                                <th className="border p-2" style={{ width: '6vw' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} className="hover:pd-bg-muted">
                                    {/* Customer */}
                                    <td className="border p-2">
                                        <AppAsyncSelect
                                            onChange={(opt) => handleRowClientSelect(row.id, opt)}
                                            loadOptions={loadClientOptions}
                                            defaultOptions={AllClient.slice(0, 50)}
                                            value={row.client}
                                            className="basic-single text-sm"
                                            classNamePrefix="pd-select"
                                            isSearchable
                                            isClearable
                                            placeholder="Select Customer..."
                                        />
                                        {row.loading && <span className="text-xs pd-text-muted">Loading...</span>}
                                    </td>

                                    {/* InvRef */}
                                    <td className="border p-2">
                                        <AppSelect
                                            options={row.invDrp}
                                            value={row.selectedInvoice || null}
                                            onChange={(opt) => handleRowInvoiceSelect(row.id, opt)}
                                            isSearchable
                                            isClearable
                                            isDisabled={!row.client}
                                            placeholder={row.invDrp.length > 0 ? 'Select...' : 'Select customer first'}
                                        />
                                    </td>

                                    {/* Store (auto) */}
                                    <td className="border p-2">
                                        <input
                                            type="text"
                                            value={row.store ? (storeMap[row.store] || row.store) : ''}
                                            readOnly
                                            className="w-full p-1 text-xs md:text-sm border rounded bg-gray-100"
                                            placeholder="Auto"
                                        />
                                    </td>

                                    {/* Amount (editable) */}
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            value={row.amount || ''}
                                            onChange={(e) => {
                                                let val = Number(e.target.value) || 0;
                                                // Cap at remaining amount
                                                const maxAmt = row.invoices.find(
                                                    (inv) => (inv.SalesInvoice === row.selectedInvoice?.value
                                                        || inv.DitributorInvoiceCode === row.selectedInvoice?.value
                                                        || inv.Invoice === row.selectedInvoice?.value)
                                                );
                                                const max = maxAmt ? getRemainingAmount(maxAmt) : 0;
                                                if (val > max) {
                                                    val = max;
                                                    toast.warning(`Max amount is ${max}`);
                                                }
                                                if (val < 0) val = 0;
                                                updateRow(row.id, 'amount', val);
                                            }}
                                            className="w-full p-1 text-xs md:text-sm border rounded text-right"
                                            placeholder="0"
                                            disabled={!row.selectedInvoice}
                                        />
                                    </td>

                                    {/* Type (auto) */}
                                    <td className="border p-2 text-center">
                                        <span className="text-xs">{row.type || ''}</span>
                                    </td>

                                    {/* Action */}
                                    <td className="border p-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.id)}
                                            className="pd-btn-icon-danger text-xs"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {rows.length > 0 && (
                            <tfoot>
                                <tr className="pd-table-footer">
                                    <td className="border p-2 text-right font-bold" colSpan={3}>Total</td>
                                    <td className="border p-2 text-right font-bold">{formatAmount(totalAmount)}</td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Add Row */}
                <button
                    type="button"
                    onClick={addRow}
                    className="pd-btn-success px-4 py-2 text-sm md:text-base mb-6"
                >
                    Add Row
                </button>

                {/* Preview of the JV */}
                {rows.length > 0 && (
                    <div className="overflow-x-auto mb-6">
                        <h3 className="text-sm md:text-base pd-text-body font-bold uppercase tracking-wide mb-2">
                            JV Preview
                        </h3>
                        <table className="w-full border-collapse text-sm md:text-base">
                            <thead>
                                <tr className="pd-bg-muted">
                                    <th className="border p-2">Account</th>
                                    <th className="border p-2">Store</th>
                                    <th className="border p-2">Description</th>
                                    <th className="border p-2" style={{ width: '10vw' }}>Debit</th>
                                    <th className="border p-2" style={{ width: '10vw' }}>Credit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Debit row */}
                                <tr>
                                    <td className="border p-2">{mainLabel || 'Account (Debit)'}</td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2">{remarks || ''}</td>
                                    <td className="border p-2 text-right">{formatAmount(totalAmount)}</td>
                                    <td className="border p-2"></td>
                                </tr>
                                {/* Credit rows */}
                                {rows.filter((r) => r.selectedInvoice && r.amount > 0).map((row) => (
                                    <tr key={row.id}>
                                        <td className="border p-2">{row.client?.label || 'Customer'}</td>
                                        <td className="border p-2">{row.store ? (storeMap[row.store] || '') : ''}</td>
                                        <td className="border p-2">{row.selectedInvoice?.value || ''}</td>
                                        <td className="border p-2"></td>
                                        <td className="border p-2 text-right">{formatAmount(Number(row.amount))}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="pd-table-footer">
                                    <td className="border p-2 text-right font-bold" colSpan={3}>Total</td>
                                    <td className="border p-2 text-right font-bold">{formatAmount(totalAmount)}</td>
                                    <td className="border p-2 text-right font-bold">{formatAmount(totalAmount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={saving || rows.length === 0}
                    className="pd-btn-save text-sm md:text-base"
                >
                    {saving ? 'Saving...' : 'Create Invoice Adjust Voucher'}
                </button>
            </form>
        </div>
    );
};

export default InvoiceAdjust;
