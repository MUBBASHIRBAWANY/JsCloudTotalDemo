import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AppAsyncSelect from '../../../Global/AppAsyncSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { rangeBetween } from '../../../Global/GenrateCode';
import AppSelect from '../../../Global/AppSelect.jsx'
import AmountInput from '../../../Global/AmountInput.jsx'
import { formatAmount } from '../../../../utils/amountToWords.js'
import { createDataFunction, getDataFundtion } from '../../../../Api/CRUDFunctions';
import { logTransaction } from '../logTransaction';
import { validateClosingMonth } from '../../../Global/validateClosingMonth';
import { fetchVoucher } from '../../../../Redux/Reducers/VoucherReducer.js';
import GlobalLoader from '../../../Global/GlobalLoader.jsx';
import { fetchAllVoucherDependencies } from '../fetchVoucherDependencies.js';
import { clearEmployeeSubAccount, employeeAccountOption, employeeLineId, takeEmployeeVoucherLine, useEmployeeSubAccounts, withEmployeeAccountOptions } from '../employeeSubAccounts.js';
import { excludeControlAccounts, isDirectClientControl, isDirectTransporterPayable } from '../voucherControlAccounts.js';
import { CircularProgress } from '@mui/material';

const CashReciptVoucherAdd = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllVoucherDependencies(dispatch)
            .then(() => setLoading(false))
            .catch(() => setLoading(false));
    }, [dispatch]);
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const CashAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer)
    const employeeAccounts = useEmployeeSubAccounts()
    const RegClient = useSelector((state) => state.Client.client)
    const Reamin = useSelector((state) => state.Remaininginvoice.Remaininginvoice)
    const admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const filteredAccount = useMemo(
        () => excludeControlAccounts(
            (Account || []).filter((item) => item.AccountCode?.length > 5),
            CashAccountNumber
        ),
        [Account, CashAccountNumber]
    )
    const OpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const Distributr = useSelector((state) => state.DistributroReducers.DistributroReducers)
    const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher)

    const AllInvoice = useMemo(() => Reamin.concat(OpeningInvoices), [Reamin, OpeningInvoices])
    console.log(AllInvoice.filter((item) => item.Invoice == "D0574INV97212"));
    const Client = useMemo(() => Distributr.concat(RegClient), [Distributr, RegClient])
    const [voucherType, setVoucherType] = useState("CR")
    const [Remarks, setRemarks] = useState('')
    const [debitAccount, setDebitAccount] = useState("");
    const [creditAccount, setCreditAccount] = useState("");
    const [RecvFrom, setRecvFrom] = useState("Client");
    const [tableData, setTableData] = useState([]);
    const [invDrp, setInvDrp] = useState([])
    const [selectedStore, setselectedStore] = useState("")
    const [disabled, setDisabled] = useState(false)

    const SoftStore = useSelector((state) => state.Store.Store)
    const store = useMemo(() => [{
        _id: "0",
        StoreName: "Head Office",
        StoreCode: "HO"
    }].concat(SoftStore), [SoftStore])

    const result = useMemo(() => {
        const arr = [];
        for (let i = CashAccountNumber.CashAccountFrom; i <= CashAccountNumber.CashAccountTo; i++) {
            arr.push(i.toString().padStart(5, '0'));
        }
        return arr;
    }, [CashAccountNumber])



    const ALLStore = useMemo(() => store.map((item) => ({
        label: `${item.StoreName}`,
        value: item._id
    })), [store])

    const Cash = useMemo(() => filteredAccount.filter((item) => result.some(prefix => item.AccountCode.startsWith(prefix))), [filteredAccount, result])


    const loadAccounts = useCallback(async (inputValue) => {
        if (!inputValue) return [];

        const filtered = filteredAccount
            .filter((item) =>
                item.AccountName.toLowerCase().includes(inputValue.toLowerCase()) || item.AccountCode.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50);

        return withEmployeeAccountOptions(filtered.map((item) => ({
            label: `${item.AccountCode} ${item.AccountName}`,
            value: item._id,
            code: item.AccountCode
        })), employeeAccounts, inputValue);
    }, [filteredAccount, employeeAccounts])
    const CashAccount = useMemo(() => Cash.map((item) => ({
        label: `${item.AccountCode} ${item.AccountName}`,
        value: item._id
    })), [Cash]);
    const startingAccount = useMemo(() => filteredAccount.slice(0, 50).map((item) => ({
        label: `${item.AccountCode} ${item.AccountName}`,
        value: item._id,
        code: item.AccountCode
    })), [filteredAccount]);
    const [show, setShow] = useState(false)
    const { register, handleSubmit, reset, formState: { errors } } = useForm();


    const addNewRow = useCallback(() => {
        setTableData((prev) => [...prev, {
            id: Date.now(),
            Account: '',
            store: '',
            vendor: '',
            Debit: 0,
            Credit: 0,
        }]);
    }, []);

    const removeRow = useCallback((id) => {
        setTableData((prev) => prev.filter(row => row.id !== id));
    }, []);

    const handleCellChange = useCallback((id, field, value) => {
        setTableData((prev) => {
            let newTableData = [...prev];

            const rowIndex = newTableData.findIndex(row => row.id === id);
            if (rowIndex === -1) return prev;

            let updatedRow = { ...newTableData[rowIndex], [field]: value };



            // Reset debit/credit if no account
 if (
    (field === "Account" || field === "Client") &&
    (updatedRow.Account === "" || updatedRow.Client === "")
) {
    updatedRow.Debit = 0;
    updatedRow.store = selectedStore
    updatedRow.Credit = 0;
    setInvDrp([]);
    updatedRow.ClientRef2 = "";
}
        
            // Handle store field
            if (field === "store") {
                updatedRow.store = value.value;
            }
            if (field === "Narration") {    
                updatedRow.Narration = value
            }
            if (field === "Account") {
                const employeeLine = takeEmployeeVoucherLine(updatedRow, value, CashAccountNumber, employeeAccounts);
                if (employeeLine.handled) {
                    if (employeeLine.error) {
                        toast.error(employeeLine.error);
                        return prev;
                    }
                    updatedRow = { ...employeeLine.row, store: selectedStore, Narration: Remarks, Debit: 0, Credit: 0 };
                    setInvDrp([]);
                } else {
                updatedRow = clearEmployeeSubAccount(updatedRow);
                if (isDirectClientControl(value, CashAccountNumber)) {
                    toast.error("Ap client main entry karin");
                    return prev;
                }
                if (isDirectTransporterPayable(value, CashAccountNumber)) {
                    toast.error("Ap transporter select karin — Transporter Payable direct select nahi hoga");
                    return prev;
                }
                updatedRow.Account = value.value
                updatedRow.store = selectedStore
                
                updatedRow.Narration = Remarks
                setInvDrp([])
                updatedRow.ClientRef2 = ""
                updatedRow.Credit = 0
                updatedRow.Debit = 0,
                updatedRow.Client = ""
                }
            }
            // Handle Account field
            if (field === "Client") {
                updatedRow.Client = value.value
                updatedRow.Narration = `Rcvd cash from ${value.label}`
                updatedRow.ClientRef2 = ""
                const totalinvoice = AllInvoice.filter((item) => item.Client == value.value).map((val) => ({
                    label: val.SalesFlowRef
                        ? [val.SalesFlowRef, val.SalesInvoice].filter(Boolean).join(" ")
                        : val.Invoice,
                    value: val.SalesInvoice || val.Invoice,
                    Store: val.Store || val.store

                }))

                const StoreInvoice = totalinvoice.filter((item) => item.Store == selectedStore)
                const withAdvance = [{
                    label: "Advance",
                    value: "Advance",
                }]
                updatedRow.store = selectedStore
                    setInvDrp(withAdvance.concat(StoreInvoice))

                if (value.value === debitAccount || value.value === creditAccount) {
                    toast.error("You cannot select the main account as a transaction account");
                    updatedRow.Account = "";
                } else {
                    updatedRow.Account = CashAccountNumber.Client;
                    updatedRow.store = selectedStore
                    updatedRow.Debit = 0;
                    updatedRow.Credit = 0;
                }
            }

            // Handle Debit field
            if (field === "Debit") {
                updatedRow.Debit = value;
                updatedRow.Credit = 0;
            }

            // Handle Credit field
            if (field === "Credit") {
                const amount = Number(value) || 0;
                if (RecvFrom !== "other") {
                    const ref = String(updatedRow.ClientRef2 || "").trim();
                    if (ref && ref !== "Advance") {
                        const invoice = AllInvoice.find((val) => val.Invoice == ref || val.SalesInvoice === ref);
                        const remaining = Number(invoice?.RemainingAmount ?? invoice?.RemaingAmount ?? 0);
                        if (invoice && amount > remaining) {
                            toast.error("Excess amount is not allowed");
                            return prev;
                        }
                    }
                }
                updatedRow.Credit = RecvFrom == "other" ? value : amount;
                updatedRow.Debit = 0;
            }

            // Handle Ref field (async part)
            if (field === "ClientRef2") {
                const findRef = prev.find((item) => item.ClientRef2 === value.value)
                if (findRef) {
                    toast.error("Already in the table")
                    return prev;
                }
                updatedRow.ClientRef2 = value.value;
                if (value.value !== "Advance") {
                    const RemainInvAmt = AllInvoice.find((val) => val.SalesInvoice === value.value)?.RemainingAmount || AllInvoice.find((val) => val.Invoice === value.value)?.RemaingAmount
                    const Type = AllInvoice.find((val) => val.SalesInvoice === value.value) || AllInvoice.find((val) => val.Invoice === value.value)
                    updatedRow.Narration = `Rcvd cash from ${Client.find((item) => item._id == updatedRow.Client).CutomerName || Distributr.find((item) => item._id == updatedRow.Client)?.DistrbutorName} Aginst Invoice # ${value.label}`
                    if (Type.Invoice == undefined) {
                        updatedRow.Type = "Current"
                    }
                    else {
                        updatedRow.Type = "Opening"
                    }
                    updatedRow.Credit = RemainInvAmt
                } else {
                    updatedRow.Narration = `Rcvd cash from ${Client.find((item) => item._id == updatedRow.Client).CutomerName || Distributr.find((item) => item._id == updatedRow.Client)?.DistrbutorName} as Advance`
                    updatedRow.Credit = 0
                }
            }

            // Update row in the new table data
            newTableData[rowIndex] = updatedRow;

            // Finally, update state
            return newTableData;
        });
    }, [AllInvoice, Client, Distributr, RecvFrom, Remarks, selectedStore, debitAccount, creditAccount, CashAccountNumber, employeeAccounts]);




    const TotalDebit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0), [tableData]);
    const TotalCredit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0), [tableData]);
    const onSubmit = async (data) => {
        if (disabled) return;
        setDisabled(true);

        if (validateClosingMonth(data.VoucherDate, loginVendor)) {
            setDisabled(false);
            return;
        }

        // Check: store must be selected
        if (!selectedStore) {
            setDisabled(false);
            return toast.error("Please select a Store");
        }

        // Check: Client row with Credit must have ClientRef2
        const clientCreditWithoutRef = tableData.find(
            (row) => row.Client && Number(row.Credit) > 0 && !String(row.ClientRef2 || row.Ref || "").trim()
        );
        if (clientCreditWithoutRef) {
            setDisabled(false);
            return toast.error("Client row on Credit side must have an Invoice Reference (Ref)");
        }

        try {
            // 🔍 Filter table
            const filterTable = tableData.filter((a) =>
                voucherType === "CR"
                    ? a.Account !== debitAccount
                    : a.Account !== creditAccount
            );

            data.PaidFor = RecvFrom;

            let FilterTotalDebit = filterTable.reduce(
                (sum, row) => sum + (parseFloat(row.Debit) || 0),
                0
            );

            let FilterTotalCredit = filterTable.reduce(
                (sum, row) => sum + (parseFloat(row.Credit) || 0),
                0
            );

            data.Type = "Cash";

            // ✅ Add balancing row (without mutating original)
            const updatedTable = [
                ...filterTable,
                {
                    id: Date.now(),
                    Account:
                        voucherType === "CR" ? debitAccount : creditAccount,
                    Credit:
                        voucherType === "CP"
                            ? Math.abs(FilterTotalDebit - FilterTotalCredit)
                            : 0,
                    Debit:
                        voucherType === "CR"
                            ? Math.abs(FilterTotalDebit - FilterTotalCredit)
                            : 0,
                    store: selectedStore ? String(selectedStore) : "",
                    Narration: tableData[0]?.Narration,
                    show: true,
                },
            ];

            setTableData(updatedTable);

            data.VoucharData = updatedTable;
            data.VoucherMainAccount =
                voucherType === "CR" ? debitAccount : creditAccount;

            data.status = "False";

            // 📅 Date-based Voucher Number
            const date = new Date(data.VoucherDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");

            const prefix = `${voucherType}${year}${month}`; // CR202605

            // 🔍 Get last voucher
            const code = await getDataFundtion(
                `/Voucher/GetLastVouher/${voucherType}?Voucherdate=${data.VoucherDate}`
            );
            let serial = 1;

            if (code && code.length > 0) {
                const lastVoucher = code[0]?.VoucherNumber;

                if (lastVoucher && lastVoucher.startsWith(prefix)) {
                    const lastSerial = parseInt(lastVoucher.slice(8), 10);
                    serial = isNaN(lastSerial) ? 1 : lastSerial + 1;
                }
            }

            // 🎯 Final Voucher Number
            data.VoucherNumber = `${prefix}${String(serial).padStart(4, "0")}`;
            // 🔢 Totals
            const TotalDebit = updatedTable.reduce(
                (sum, row) => sum + (parseFloat(row.Debit) || 0),
                0
            );

            const TotalCredit = updatedTable.reduce(
                (sum, row) => sum + (parseFloat(row.Credit) || 0),
                0
            );

            data.VoucherType = voucherType;
            data.TotalDebit = TotalDebit;
            data.TotalCredit = TotalCredit;

            // ✅ Balance check
            if (TotalDebit - TotalCredit !== 0) {
                setDisabled(false);
                return toast.error("Credit and Debit must be equal");
            }

            // 🧾 Invoice Mapping
            const invoiceData = updatedTable
                .filter((item) => item.ClientLine === "true")
                .map((inv) => ({
                    amount: inv.Credit,
                    inv: inv.ClientRef2,
                }));

            data.invoiceData = invoiceData;

            // 🚀 Save
            const res = await createDataFunction("/Voucher", data);

            const allVoucher = EditVoucher;
            const totalVoucher = [...allVoucher, res.voucher];
            dispatch(fetchVoucher(allVoucher || []));

            // 📝 Log
            await logTransaction({
                data,
                loginVendor,
                type: "Cash Receipt Voucher",
            });

            toast.success("Cash Receipt Voucher Created Successfully");

            setTimeout(() => {
                navigate(`/CashReciptVoucherView/${res.voucher._id}`);
            }, 1000);

        } catch (err) {
            setDisabled(false);

            if (err?.response?.status === 401) {
                toast.error(err.response.data.message);
            } else {
                console.error(err);
                toast.error("Something went wrong");
            }
        }
    };


    useEffect(() => {
        const today = new Date();
        const formatted = today.toISOString().split("T")[0]; // YYYY-MM-DD
        reset({
            VoucherDate: formatted
        })
    }, []);

    const customStyles = {
        control: (provided) => ({
            ...provided,
            backgroundColor: 'transparent', // Entire input background
            borderColor: '#ccc',
        }),
        singleValue: (provided) => ({
            ...provided,
            backgroundColor: 'transparent', // Selected item in input
            color: '#000', // Text color
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected
                ? 'transparent' // No background on selected option
                : state.isFocused
                    ? 'rgba(0, 0, 0, 0.05)' // Slight highlight on hover
                    : 'transparent',
            color: '#000',
        }),
    };
    const AllClientDrp = useMemo(() => Account.filter((Acc) => Acc._id == CashAccountNumber.WithholdingTax).concat(Client), [Account, CashAccountNumber, Client])

    const AllClient = useMemo(() => AllClientDrp.map((item) => ({
        label: `${item.CutomerName || item.DistrbutorName || item.AccountName} ${item.SalesFlowRef || ""} `,
        value: item._id
    })), [AllClientDrp]);

    const LoadClient = useCallback(async (inputValue) => {

        const filtered = AllClient
            .filter((item) =>
                item.label.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50);
        return filtered
    }, [AllClient]) 

    const defaultClient = useMemo(() => AllClient.slice(0, 50), [AllClient])

    return (
        <div className="p-4">
            <GlobalLoader loading={loading} message="Loading Cash Receipt Voucher..." />
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Cash Book</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Voucher Date </label>
                        <input
                            type="date"
                            
                            style={{ height: "38px" }}
                            {...register("VoucherDate", { required: true })}
                            className="pd-input text-sm md:text-base"
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Store </label>
                        <AppSelect
                            onChange={(selectedOption) => setselectedStore(selectedOption.value)}
                            options={ALLStore}
                            value={selectedStore ? {
                                value: `${selectedStore}`,
                                label: `${ALLStore.find((c) => c.value === selectedStore)?.label}`
                            } : null}
                            className="basic-single text-sm"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Store..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Debit Account </label>
                        <AppSelect
                            onChange={(selectedOption) => setDebitAccount(selectedOption.value)}
                            options={CashAccount}
                            value={debitAccount ? {
                                value: `${debitAccount}`,
                                label: `${Account.find((c) => c._id === debitAccount)?.AccountCode} ${Account.find((c) => c._id === debitAccount)?.AccountName}`
                            } : null}
                            className="basic-single text-sm"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Debit account..."
                        />
                    </div>
                    {voucherType !== "" ?
                        <>
                            <div>
                                <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Voucher Number </label>
                                <input
                                    type="text"
                                    disabled={true}
                                    style={{ height: "38px" }}
                                    {...register("Voucher")}
                                    className="pd-input text-sm md:text-base"
                                />
                            </div>
                            <div>
                                <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Ref </label>
                                <input
                                    type="text"
                                    style={{ height: "38px" }}
                                    {...register("Cheque")}
                                    className="pd-input text-sm md:text-base"
                                />
                            </div>


                            <div className='w-full col-span-1'>
                                <label className="block text-sm md:text-base col-span-3 pd-text-body font-semibold mb-2"> Remarks </label>
                                <input
                                    type="text"
                                    style={{ height: "38px", width: "100%" }}
                                    {...register("Remarks")}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    className="pd-input text-sm md:text-base col-span-5"
                                />
                            </div>
                        </> : null
                    }

                    <div className='flex gap-2 col-span-1'>
                        <label className="text-sm md:text-base pd-text-body font-semibold mb-2">
                            Received Customer
                        </label>
                        <input
                            type="radio"
                            name="RecvFrom"
                            value="Client"
                            disabled={tableData.length !== 0 ? true : false}
                            onChange={(e) => setRecvFrom(e.target.value)}
                            checked={RecvFrom === "Client"}
                            
                        />

                        <label className="text-sm md:text-base pd-text-body font-semibold mb-2">
                            Received Other
                        </label>
                        <input
                            type="radio"
                            name="RecvFrom"
                            value="other"
                            disabled={tableData.length !== 0 ? true : false}
                            onChange={(e) => setRecvFrom(e.target.value)}
                            checked={RecvFrom === "other"}
                            
                        />
                    </div>




                </div>

                <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr className="pd-bg-muted">
                                <th className="border p-2 min-w-[200px]">Account</th>
                                {RecvFrom == "Client" ? <th className="border p-2" style={{ width: "8vw" }}>Ref</th> : null}
                                <th className="border p-2" style={{ width: "5vw" }}>Slip</th>
                                <th className="border p-2" style={{ width: "5vw" }}>Debit</th>
                                <th className="border p-2" style={{ width: "5vw" }}>Credit</th>
                                <th className="border p-2">Narration</th>
                                <th className="border p-2" style={{ width: "8vw" }}>Action</th>

                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row) => (
                                <>
                                    <tr key={row.id} className="hover:pd-bg-muted">
                                        <td className="border p-2">
                                            {RecvFrom == "Client" ? <AppAsyncSelect
                                                onChange={(selectedOption) =>
                                                    handleCellChange(row.id, 'Client', selectedOption || '')
                                                }
                                                loadOptions={LoadClient}
                                                value={row.show == true ? (row.Account
                                                    ? {
                                                        value: row.Account,
                                                        label: `${Account.find((c) => c._id === row.Account)?.AccountCode} ${Account.find((c) => c._id === row.Account)?.AccountName}`,
                                                    }
                                                    : null) : (row.Client ? {
                                                        value: `${row.Client}`,
                                                        label: `${Client.find((c) => c._id === row.Client)?.CutomerName || Distributr.find((c) => c._id === row.Client)?.DistrbutorName} ${Client.find((c) => c._id === row.Client)?.SalesFlowRef || ""}`,
                                                    } : null)}
                                                className="basic-single text-sm"
                                                classNamePrefix="pd-select"
                                                isSearchable
                                                defaultOptions={defaultClient}
                                                placeholder="Select Client..."
                                            /> : <AppAsyncSelect
                                                onChange={(selectedOption) =>
                                                    handleCellChange(row.id, 'Account', selectedOption || '')
                                                }
                                                loadOptions={loadAccounts}
                                                defaultOptions={startingAccount}
                                                value={
                                                    employeeAccountOption(employeeAccounts, employeeLineId(row))
                                                    || (row.Account
                                                        ? {
                                                            value: row.Account,
                                                            label: `${Account.find((c) => c._id === row.Account)?.AccountCode} ${Account.find((c) => c._id === row.Account)?.AccountName}`,
                                                        }
                                                        : null)
                                                }
                                                className="basic-single text-sm"
                                                classNamePrefix="pd-select"
                                                isSearchable
                                                placeholder="Select Account..."
                                            />
                                            }
                                        </td>

                                        {RecvFrom == "Client" ? <td colSpan={1} className="p-2 border-t">
                                            <AppSelect options={invDrp}
                                                onChange={(selectedOption) =>
                                                    handleCellChange(row.id, 'ClientRef2', selectedOption || '')
                                                }
                                                value={({
                                                    value: row.ClientRef2,
                                                    label: row.ClientRef2
                                                })}
                                            />
                                        </td>
                                            : null}
                                        <td className="border p-2">
                                            <input
                                                style={{ width: "5vw" }}
                                                type="text"
                                                value={row.Slip}
                                                onChange={(e) => handleCellChange(row.id, 'Slip', e.target.value)}
                                                className="w-full p-1 text-xs md:text-sm border rounded"
                                            />
                                        </td>
                                        <td className="border p-2">
                                            <AmountInput
                                                style={{ width: "5vw" }}
                                                value={row.Debit}
                                                onChange={(raw) => handleCellChange(row.id, 'Debit', raw)}
                                                className="w-full p-1 text-xs md:text-sm border rounded"
                                            />
                                        </td>

                                        <td className="border p-2">
                                            <AmountInput
                                                style={{ width: "5vw" }}
                                                value={row.Credit}
                                                onChange={(raw) => handleCellChange(row.id, 'Credit', raw)}
                                                className="w-full p-1 text-xs md:text-sm border rounded"
                                            />
                                        </td>
                                        <td colSpan={1} className="p-2 border-t">
                                            <input
                                                type="text"
                                                value={row.Narration || ''}
                                                onChange={(e) => handleCellChange(row.id, 'Narration', e.target.value)}
                                                placeholder="Enter narration..."
                                                className="w-full p-2 text-xs md:text-sm border rounded"
                                            />
                                        </td>

                                        <td className="border p-2">
                                            <button
                                                type="button"
                                                onClick={() => removeRow(row.id)}
                                                className="pd-btn-icon-danger text-xs md:text-sm"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Narration row */}

                                </>

                            ))}
                        </tbody>
                        {tableData.length !== 0 && (
                            <tfoot>
                                <tr className="pd-table-footer">
                                    <td className="border p-2"></td>
                                    {voucherType == "CR" ? <td className="border p-2"></td> : null}
                                    <td className="border p-2"></td>
                                    <td className="border p-2 hidden md:table-cell text-right tabular-nums">{formatAmount(TotalDebit)}</td>
                                    <td className="border p-2 hidden md:table-cell text-right tabular-nums">{formatAmount(TotalCredit)}</td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2"></td>

                                </tr>
                            </tfoot>

                        )}
                    </table>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <button
                        type="button"
                        onClick={addNewRow}
                        disabled={!debitAccount || !selectedStore}
                        className="pd-btn-success px-4 py-2 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add Row
                    </button>
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
                            "Create Cash Voucher"
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default CashReciptVoucherAdd
