import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AppSelect from '../../../Global/AppSelect.jsx'
import AmountInput, { parseAmountInput } from '../../../Global/AmountInput.jsx'
import { createDataFunction } from '../../../../Api/CRUDFunctions';
import { validateClosingMonth } from '../../../Global/validateClosingMonth.jsx';
import { fetchVoucher } from '../../../../Redux/Reducers/VoucherReducer.js';
import GlobalLoader from '../../../Global/GlobalLoader.jsx';
import { fetchAllVoucherDependencies } from '../fetchVoucherDependencies.js';
import { CircularProgress } from '@mui/material';

const ShortageAdjustAdd = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const [disabled, setDisabled] = useState(false);

    useEffect(() => {
        fetchAllVoucherDependencies(dispatch)
            .then(() => setLoading(false))
            .catch(() => setLoading(false));
    }, [dispatch]);

    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const SoftStore = useSelector((state) => state.Store.Store)
    const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher)
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)

    const filteredAccount = useMemo(() => Account.filter((item) => item.AccountCode.length > 5), [Account])

    const store = useMemo(() => [{
        _id: "0",
        StoreName: "Head Office",
        StoreCode: "HO"
    }].concat(SoftStore), [SoftStore])

    const ALLStore = useMemo(() => store.map((item) => ({
        label: `${item.StoreName}`,
        value: item._id
    })), [store])

    const [debitAccount, setDebitAccount] = useState(null)
    const [creditAccount, setCreditAccount] = useState(null)
    const [SelectStore, setSelectStore] = useState(null)
    const [remarks, setRemarks] = useState('')

    const { register, handleSubmit, reset, watch, setValue } = useForm();

    // Only the Admin-configured accounts (Shortage, Advance, Loan) are selectable
    const adminAccountOptions = useMemo(() => {
        const ids = [Admin?.shortageAccount, Admin?.advance, Admin?.loan].filter(Boolean);
        return ids
            .map((id) => filteredAccount.find((item) => item._id === id))
            .filter(Boolean)
            .map((item) => ({
                label: `${item.AccountCode} ${item.AccountName}`,
                value: item._id,
                code: item.AccountCode
            }));
    }, [Admin, filteredAccount]);

    useEffect(() => {
        const today = new Date();
        const formatted = today.toISOString().split("T")[0]; // YYYY-MM-DD
        reset({
            VoucherDate: formatted
        })
    }, []);

    const onSubmit = async (data) => {
        if (disabled) return;
        setDisabled(true);

        if (validateClosingMonth(data.VoucherDate, loginVendor)) {
            setDisabled(false);
            return;
        }

        if (!debitAccount?.value) {
            setDisabled(false);
            return toast.error("Debit Account is required");
        }
        if (!creditAccount?.value) {
            setDisabled(false);
            return toast.error("Credit Account is required");
        }
        if (debitAccount.value === creditAccount.value) {
            setDisabled(false);
            return toast.error("Debit and Credit Account must be different");
        }
        const amount = parseAmountInput(data.Amount);
        if (!amount || amount <= 0) {
            setDisabled(false);
            return toast.error("Amount must be greater than 0");
        }
        if (!SelectStore?.value) {
            setDisabled(false);
            return toast.error("Store is required");
        }

        try {
            // 📅 Extract Year & Month
            const date = new Date(data.VoucherDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");

            const voucherType = "JV";
            const prefix = `${voucherType}${year}${month}`; // JV202605
            // 🔍 Get last voucher
            const code = await createDataFunction(
                `/Voucher/GetLastVouherByDate/${voucherType}?Voucherdate=${data.VoucherDate}`, { prefix: prefix });

            let serial = 1;
            if (code && code.length > 0) {
                const lastVoucher = code[0]?.VoucherNumber;

                if (lastVoucher && lastVoucher.startsWith(prefix)) {
                    const lastSerial = parseInt(lastVoucher.slice(8), 10); // after JVYYYYMM
                    serial = isNaN(lastSerial) ? 1 : lastSerial + 1;
                }
            }

            // 🎯 Final Voucher Number
            data.VoucherNumber = `${prefix}${String(serial).padStart(4, "0")}`;

            // 🧾 Voucher Type
            data.VoucherType = voucherType;
            data.status = "Post";
            data.TotalDebit = amount;
            data.TotalCredit = amount;
            data.Remarks = remarks || "Shortage Adjust";

            // 📄 Voucher Lines
            data.VoucharData = [
                {
                    Account: debitAccount.value,
                    Debit: amount,
                    Credit: 0,
                    store: SelectStore.value,
                    Narration: remarks || "",
                },
                {
                    Account: creditAccount.value,
                    Debit: 0,
                    Credit: amount,
                    store: SelectStore.value,
                    Narration: remarks || "",
                },
            ];

            // 🚀 Save
            const res = await createDataFunction("/Voucher", data);
            dispatch(fetchVoucher([...(EditVoucher || []), res.voucher]));

            toast.success("Shortage Adjust Voucher Created Successfully");

            setTimeout(() => {
                navigate(`/JournalVoucherView/${res.voucher._id}`);
            }, 1000);

        } catch (err) {
            setDisabled(false);

            if (err?.response?.status === 401) {
                toast.error(err.response.data.message);
            }
            else if (err?.response?.data?.message) {
                toast.error(err.response.data.message);
            }
            else {
                console.error(err);
                toast.error("Something went wrong");
            }
        }
    };

    return (
        <div className="p-4">
            <GlobalLoader loading={loading} message="Loading Shortage Adjust..." />
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Shortage Adjust</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Voucher Date</label>
                        <input
                            type="date"
                            style={{ height: "38px" }}
                            {...register("VoucherDate", { required: true })}
                            className="pd-input text-sm md:text-base"
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Debit Account</label>
                        <AppSelect
                            options={adminAccountOptions}
                            value={adminAccountOptions.find((a) => a.value === debitAccount?.value) || null}
                            isClearable
                            isSearchable
                            placeholder="Select Debit Account..."
                            className="basic-single text-sm"
                            classNamePrefix="pd-select"
                            onChange={(option) => setDebitAccount(option || null)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Credit Account</label>
                        <AppSelect
                            options={adminAccountOptions}
                            value={adminAccountOptions.find((a) => a.value === creditAccount?.value) || null}
                            isClearable
                            isSearchable
                            placeholder="Select Credit Account..."
                            className="basic-single text-sm"
                            classNamePrefix="pd-select"
                            onChange={(option) => setCreditAccount(option || null)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Amount</label>
                        <AmountInput
                            style={{ height: "38px" }}
                            className="pd-input text-sm md:text-base"
                            placeholder="0"
                            required
                            value={watch("Amount") ?? ""}
                            onChange={(raw) => setValue("Amount", raw, { shouldValidate: true, shouldDirty: true })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Store</label>
                        <AppSelect
                            options={ALLStore}
                            value={SelectStore}
                            onChange={(selectedOption) => setSelectStore(selectedOption || null)}
                            className="basic-single text-sm"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Store..."
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Remarks / Narration</label>
                        <input
                            type="text"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            style={{ height: "38px" }}
                            className="pd-input text-sm md:text-base"
                            placeholder="Enter narration..."
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={disabled}
                        className="pd-btn-save text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {disabled ? (
                            <>
                                <CircularProgress size={18} color="inherit" />
                                <span>Creating...</span>
                            </>
                        ) : (
                            "Create Shortage Adjust Voucher"
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default ShortageAdjustAdd
