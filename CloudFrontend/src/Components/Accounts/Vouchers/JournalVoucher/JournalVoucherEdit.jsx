import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppAsyncSelect from '../../../Global/AppAsyncSelect.jsx'
import AppSelect from '../../../Global/AppSelect.jsx'
import AmountInput from '../../../Global/AmountInput.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { getDataFundtion, updateDataFunction } from '../../../../Api/CRUDFunctions';
import { logTransaction } from '../logTransaction';
import { formatAmount, amountToWords } from '../../../../utils/amountToWords.js';
import { validateClosingMonth } from '../../../Global/validateClosingMonth';
import GlobalLoader from '../../../Global/GlobalLoader.jsx';
import { fetchAllVoucherDependencies } from '../fetchVoucherDependencies.js';
import { clearEmployeeSubAccount, employeeAccountOption, employeeLineId, takeEmployeeVoucherLine, useEmployeeSubAccounts, withEmployeeAccountOptions } from '../employeeSubAccounts.js';
import { excludeControlAccounts, isDirectClientControl, isDirectTransporterPayable } from '../voucherControlAccounts.js';
import { assertEditableVoucher, parseVoucherByIdResponse } from '../voucherEditAccess.js';
import { useDispatch } from 'react-redux';
import { CircularProgress } from '@mui/material';

const JournalVoucherEdit = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { id } = useParams();
    const Reamin = useSelector((state) => state.Remaininginvoice.Remaininginvoice)
    const OpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);
    const remainingInvoices = Array.isArray(Reamin) ? Reamin : [];
    const openingInvoices = Array.isArray(OpeningInvoices) ? OpeningInvoices : [];
    const AllInvoice = useMemo(() => remainingInvoices.concat(openingInvoices), [remainingInvoices, openingInvoices])
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const employeeAccounts = useEmployeeSubAccounts()
    const City = useSelector((state) => state.City.City)
    const cityList = Array.isArray(City) ? City : [];

    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const accountList = Array.isArray(Account) ? Account : [];
    const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher);
    const editVoucherRef = useRef(EditVoucher);
    editVoucherRef.current = EditVoucher;
    const Client1 = useSelector((state) => state.Client.client)
    const Client = (Array.isArray(Client1) ? Client1 : []).map((item) => ({
        ...item,
        DistrbutorName: item.DistrbutorName + ` (${cityList.find((c) => c._id === item.City)?.CityName || ''})`
    }));
    const TransportRaw = useSelector((state) => state.Transport.Transport)
    const Transport = Array.isArray(TransportRaw) ? TransportRaw : [];
    const filteredAccount = useMemo(
        () => excludeControlAccounts(
            accountList.filter((item) => item.AccountCode?.length > 5),
            Admin
        ),
        [accountList, Admin]
    );
    const [invDrp, setInvDrp] = useState([])
    const [ClientInv, setClientInv] = useState([])
    const [tableData, setTableData] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [disabled, setDisabled] = useState(false);
    const [depsLoading, setDepsLoading] = useState(true);
    const [voucherType, setVoucherType] = useState("JV");
    const [currentVoucher, setCurrentVoucher] = useState(null);
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);

    const { register, handleSubmit, setValue } = useForm();
    const SoftStore = useSelector((state) => state.Store.Store)
    const store = useMemo(() => [{
        _id: "0",
        StoreName: "Head Office",
        StoreCode: "HO"
    }].concat(Array.isArray(SoftStore) ? SoftStore : []), [SoftStore]);

    /* ----------------------------------
       Helper: Build AsyncSelect value
    ---------------------------------- */
    const getAccountOption = useCallback((clientid, accountId, transporterId, subAccountId) => {
        const employeeOpt = employeeAccountOption(employeeAccounts, subAccountId);
        if (employeeOpt) return employeeOpt;
        const cust = Client.find((item) => item._id == clientid)
        if (cust) {
            return {
                value: cust._id,
                label: `${cust.AccountCode || cust.SalesFlowRef || cust.OldCode || ""} ${cust.CutomerName || cust.DistrbutorName || ""}`,
                code: cust.AccountCode || cust.SalesFlowRef
            };

        }

        // Check Transport
        const transporter = Transport.find((item) => item._id == transporterId)
        if (transporter) {
            return {
                value: transporter._id,
                label: `${transporter.TransporterName || ""} Transport`,
                code: transporter.AccountCode || ""
            };
        }

        if (!accountId) return null;
        const acc = accountList.find(a => String(a._id) === String(accountId));
        if (!acc) return null;

        return {
            value: acc._id,
            label: `${acc.AccountCode} ${acc.AccountName}`,
            code: acc.AccountCode
        };
    }, [Client, accountList, Transport, employeeAccounts]);

    const applyVoucher = useCallback((voucherData) => {
        if (!voucherData || Array.isArray(voucherData)) return;
        const asId = (val) => {
            if (!val) return "";
            if (typeof val === "object") return val._id || val.value || "";
            return val;
        };

        setValue("VoucherDate", typeof voucherData.VoucherDate === "string" ? voucherData.VoucherDate.split("T")[0] : "");
        setValue("Voucher", voucherData.VoucherNumber || "");
        setValue("Remarks", voucherData.Remarks || "");
        setValue("Cheque", voucherData.Cheque || voucherData.Ref || "");
        setVoucherType(voucherData.VoucherType || "JV");

        const rows = (voucherData.VoucharData || []).map((row, index) => {
            const clientId = asId(row.Client);
            return {
                id: row.id || Date.now() + index,
                Account: asId(row.Account),
                Client: clientId,
                ClientLine: row.ClientLine || (clientId ? "true" : undefined),
                Transporter: asId(row.Transporter),
                store: asId(row.store),
                ClientRef2: row.ClientRef2 || "",
                Slip: row.Slip || "",
                Debit: row.Debit || 0,
                Credit: row.Credit || 0,
                Narration: row.Narration || "",
                EBF: asId(row.EBF),
                Loan: asId(row.Loan),
                Advance: asId(row.Advance),
                BadDebt: asId(row.BadDebt),
            };
        });

        setTableData(rows);
        setCurrentVoucher(voucherData);
        const clientRow = rows.find((row) => row.Client);
        if (clientRow?.Client) setSelectedClientId(clientRow.Client);
    }, [setValue]);

    /* ----------------------------------
       Open this voucher directly. Redux may already hold another
       voucher type, so an empty-list check never refetches on navigation.
    ---------------------------------- */
    useEffect(() => {
        let cancelled = false;
        const loadAll = async () => {
            setIsLoading(true);
            setDepsLoading(true);
            try {
                await fetchAllVoucherDependencies(dispatch);
            } catch (err) {
                console.error(err);
            }
            if (cancelled) return;

            try {
                const cached = (editVoucherRef.current || []).find((v) => String(v._id) === String(id));
                let voucherData = cached;
                try {
                    const res = await getDataFundtion(`/Voucher/VoucherByID/${id}`);
                    const apiVoucher = parseVoucherByIdResponse(res);
                    if (apiVoucher) voucherData = apiVoucher;
                } catch (apiErr) {
                    console.error(apiErr);
                }
                if (cancelled) return;
                if (!voucherData) {
                    toast.error("Voucher not found");
                    return;
                }
                if (!assertEditableVoucher({
                    voucher: voucherData,
                    expectedType: "JV",
                    userRights: UserRihts,
                    navigate,
                    toast,
                })) {
                    return;
                }
                applyVoucher(voucherData);
            } catch (err) {
                console.error(err);
                if (!cancelled) toast.error("Failed to load voucher");
            } finally {
                if (!cancelled) {
                    setDepsLoading(false);
                    setIsLoading(false);
                }
            }
        };
        loadAll();
        return () => { cancelled = true; };
    }, [dispatch, id, applyVoucher]);

    /* ----------------------------------
       Async Account Loader
    ---------------------------------- */
    const loadAccounts = useCallback(async (inputValue) => {
        if (!inputValue) return [];

        const search = inputValue.toLowerCase();

        const filtered = [...(filteredAccount || []), ...(Client || []), ...(Transport || [])]
            .filter((item) =>
                (item.AccountName || "").toLowerCase().includes(search) ||
                (item.AccountCode || "").toLowerCase().includes(search) ||
                (item.CutomerName || "").toLowerCase().includes(search) ||
                (item.SalesFlowRef || "").toLowerCase().includes(search) ||
                (item.DistrbutorName || "").toLowerCase().includes(search) ||
                (item.TransporterName || "").toLowerCase().includes(search) ||
                (item.OldCode || "").toLowerCase().includes(search)
            )
            .slice(0, 50);


        return withEmployeeAccountOptions(filtered.map((item) => ({
            label: `${item.AccountCode || item.SalesFlowRef || item.OldCode || ""} ${item.AccountName || item.CutomerName || item.DistrbutorName || item.TransporterName + " Transport" || ""}`,
            value: item._id,
            code: item.AccountCode || item.SalesFlowRef
        })), employeeAccounts, search);
    }, [filteredAccount, Client, Transport, employeeAccounts]);


    const startingAccount = useMemo(() => {
        const accounts = filteredAccount.slice(0, 50).map(item => ({
            label: `${item.AccountCode} ${item.AccountName}`,
            value: item._id,
            code: item.AccountCode
        }));
        const transports = (Transport || []).map(item => ({
            label: `${item.TransporterName || ""} Transport`,
            value: item._id,
            code: item.AccountCode || ""
        }));
        return [...accounts, ...transports];
    }, [filteredAccount, Transport]);

    /* ----------------------------------
       Table Handlers
    ---------------------------------- */
    const addNewRow = () => {
        setTableData(prev => [
            ...prev,
            {
                id: Date.now(),
                Account: '',
                Debit: 0,
                Credit: 0,
                Narration: ''
            }
        ]);
    };

    const removeRow = (id) => {
        setTableData(prev => prev.filter(row => row.id !== id));
    };

    // When AllInvoice (OpeningInvoices + Reamin) loads async, refresh the invoice dropdown if a client is already selected
    useEffect(() => {
        if (selectedClientId) {
            const ClientInvoice = AllInvoice.filter((item) => item.Client == selectedClientId || item.Distrbutor == selectedClientId)
            const DrpCutInv = ClientInvoice.map((item) => ({
                label: `${item.SalesInvoice || item.DitributorInvoiceCode}  ${item.SalesFlowRef || ""} || ${item.Invoice || ""}` ,
                value: item.SalesInvoice || item.DitributorInvoiceCode || item.Invoice,
            }))
            DrpCutInv.push({ label: "Advance", value: "Advance" })
            setInvDrp(DrpCutInv)
            setClientInv(ClientInvoice)
        }
    }, [AllInvoice, selectedClientId])

    const handleCellChange = useCallback(async (id, field, value) => {
        setTableData((prev) => {
            let newTableData = [...prev];

            const rowIndex = newTableData.findIndex(row => row.id === id);
            if (rowIndex === -1) return prev;

            let updatedRow = { ...newTableData[rowIndex], [field]: value };
            const checking = prev.find((item) => item.id == id);



        // Reset debit/credit if no account
        if (updatedRow.Account === "") {
            updatedRow.Debit = 0;
            updatedRow.Credit = 0;
            setInvDrp([])
            updatedRow.ClientRef2 = ""
        }

        // Handle store field
        if (field === "store") {

            updatedRow.store = value.value;
        }

        // Handle Account field
        if (field === "Account") {
            const employeeLine = takeEmployeeVoucherLine(updatedRow, value, Admin, employeeAccounts);
            if (employeeLine.handled) {
                if (employeeLine.error) {
                    toast.error(employeeLine.error);
                    return prev;
                }
                updatedRow = { ...employeeLine.row, Debit: 0, Credit: 0 };
                setSelectedClientId(null);
                setInvDrp([]);
            } else {
            updatedRow = clearEmployeeSubAccount(updatedRow);
            // Prevent direct entry into Client / TransporterPayable control accounts
            if (isDirectClientControl(value, Admin)) {
                toast.error("Ap client main entry karin");
                return prev;
            }
            if (isDirectTransporterPayable(value, Admin)) {
                toast.error("Ap transporter select karin — Transporter Payable direct select nahi hoga");
                return prev;
            }
            setInvDrp([])
             updatedRow.ClientRef2 = ""
             updatedRow.Credit = 0
             updatedRow.Debit = 0
             updatedRow.store = ""
            //console.log(value)
            const clientAccount = Client.find((item) => item._id === value)?._id
            const transportAccount = Transport.find((item) => item._id === value)?._id

            if (clientAccount) {
                try {
                    setSelectedClientId(clientAccount)
                    const ClientInvoice = AllInvoice.filter((item) => item.Client == clientAccount || item.Distrbutor == clientAccount)
                    //console.log(ClientInvoice)
                    updatedRow.Account = Admin?.Client,
                        //console.log(Admin)
                        updatedRow.Client = clientAccount
                    setClientInv(ClientInvoice)

                    const DrpCutInv = ClientInvoice.map((item) => ({
                        label: `${item.SalesInvoice || item.DitributorInvoiceCode}  ${item.SalesFlowRef || ""} || ${item.Invoice || ""}` ,
                        value: item.SalesInvoice || item.DitributorInvoiceCode || item.Invoice,
                    }))
                    DrpCutInv.push({ label: "Advance", value: "Advance" })

                    setInvDrp(DrpCutInv)
                    updatedRow.ClientLine = "true"
                    updatedRow.ClientRef2 = "Advance"
                } catch (err) {
                    //console.log(err)
                }

            }
            else if (transportAccount) {
                setSelectedClientId(null)
                updatedRow.Account = Admin?.TransporterPayable,
                    updatedRow.Transporter = transportAccount
            }
            else {
                setSelectedClientId(null)
                updatedRow.Account = value;
                updatedRow.Debit = 0;
                updatedRow.Credit = 0;
            }
            }
        }

        // Handle Debit field
        if (field === "Debit") {
            updatedRow.Debit = value;
            updatedRow.Credit = 0;
        }

        // Handle Credit field
        if (field === "Credit") {
            updatedRow.Credit = value;
            updatedRow.Debit = 0;
        }
        if (field == "Store") {
            updatedRow.store = value.value
        }
        // Handle Ref field (async part)
        if (field === "ClientRef2") {
            updatedRow.ClientRef2 = value.value;
            if (value.value !== "Advance") {
                const RemainInvAmt = AllInvoice.find((val) => val.SalesInvoice === value.value || val.DitributorInvoiceCode === value.value || val.Invoice === value.value)
                if(RemainInvAmt && RemainInvAmt.RemaingAmount){
                    updatedRow.Type = "Opening"
                }
                else { 
                    updatedRow.Type =  "Current";
                }
                updatedRow.Credit = RemainInvAmt?.RemainingAmount || RemainInvAmt?.Remaining || RemainInvAmt?.RemaingAmount || 0
            }
        }

        // Update row in the new table data
        newTableData[rowIndex] = updatedRow;

        return newTableData;
        });
    }, [Client, Account, Admin, AllInvoice, ClientInv, Transport, employeeAccounts]);

    /* ----------------------------------
       Totals
    ---------------------------------- */
    const TotalDebit = useMemo(() => tableData.reduce((s, r) => s + Number(+r.Debit || 0), 0), [tableData]);
    const TotalCredit = useMemo(() => tableData.reduce((s, r) => s + Number(+r.Credit || 0), 0), [tableData]);

    /* ----------------------------------
       Submit
    ---------------------------------- */
    const onSubmit = async (data) => {
        if (disabled) return;
        setDisabled(true);

        if (validateClosingMonth(data.VoucherDate, loginVendor)) {
            setDisabled(false);
            return;
        }

        // Check: every row must have store selected
        const rowWithoutStore = tableData.find(row => !row.store);
        if (rowWithoutStore) {
            setDisabled(false);
            return toast.error("Store is required for every row");
        }

        // Check: Client row with Credit must have ClientRef2
        const clientCreditWithoutRef = tableData.find(
            (row) => (row.Client || row.ClientLine === "true") && Number(row.Credit) > 0 && !String(row.ClientRef2 || row.Ref || "").trim()
        );
        if (clientCreditWithoutRef) {
            setDisabled(false);
            return toast.error("Client row on Credit side must have an Invoice Reference (Ref)");
        }

        if ((TotalDebit).toFixed(2) !== (TotalCredit).toFixed(2)) {
            setDisabled(false);
            return toast.error("Debit and Credit must be equal");
        }

        if (tableData.some(r => !r.Account)) {
            setDisabled(false);
            return toast.error("Account is required in all rows");
        }

        data.VoucharData = tableData;
        data.VoucherType = voucherType;
        data.TotalDebit = TotalDebit;
        data.TotalCredit = TotalCredit;

        try {
            await updateDataFunction(`/Voucher/update/${id}`, data);
            const logData = {
                ...data,
                VoucherNumber: data.Voucher ?? currentVoucher?.VoucherNumber,
            };
            await logTransaction({
                data: logData,
                loginVendor,
                type: 'Journal Voucher Edit',
            });
            toast.success("Journal Voucher updated successfully");

            setTimeout(() => {
                navigate("/JournalVoucherList");
            }, 1000);
        } catch (err) {
            toast.error("Something went wrong");
            setDisabled(false);
        }
    };

    if (isLoading || depsLoading) return <GlobalLoader loading={true} message="Loading Journal Voucher..." />;
    const ALLStore = store.map((item) => ({
        label: `${item.StoreName}`,
        value: item._id
    }));

    /* ----------------------------------
       UI
    ---------------------------------- */
    return (
        <div className="p-4">
            <ToastContainer />

            <h1 className="text-2xl font-bold text-center mb-6">
                Edit Journal Voucher
            </h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-bg-surface p-6 rounded shadow">

                {/* HEADER */}
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
                                    className="pd-input text-sm md:text-base col-span-5"
                                />
                            </div>
                        </> : null
                    }





                </div>

                {/* TABLE */}
                <div className="overflow-x-auto">
                    <table className="w-full border text-sm">
                        <thead className="pd-bg-muted">
                            <tr>
                                <th className="border p-2">Account</th>
                                <th className="border p-2" style={{ width: "6vw" }}>Store</th>
                                <th className="border p-2" style={{ width: "6vw" }}>InvRef</th>
                                <th className="border p-2" style={{ width: "5vw" }}>Slip</th>
                                <th className="border p-2">Debit</th>
                                <th className="border p-2">Credit</th>
                                <th className="border p-2">Narration</th>
                                <th className="border p-2">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {tableData.map(row => (
                                <tr key={row.id}>
                                    <td className="border p-2">
                                        <AppAsyncSelect
                                            loadOptions={loadAccounts}
                                            defaultOptions={startingAccount}
                                            value={getAccountOption(row.Client, row.Account, row.Transporter, employeeLineId(row))}
                                            onChange={(opt) =>
                                                handleCellChange(row.id, "Account", opt?.value || "")
                                            }
                                            isClearable
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <AppSelect
                                            onChange={(selectedOption) =>
                                                handleCellChange(row.id, 'store', selectedOption || '')
                                            }
                                            options={ALLStore}
                                            value={row.store ? {
                                                value: `${row.store}`,
                                                label: `${ALLStore.find((c) => String(c.value) === String(row.store))?.label || ""}`
                                            } : null}
                                            className="basic-single text-sm"
                                            classNamePrefix="pd-select"
                                            isSearchable
                                            style={{ width: "5vw" }}
                                            placeholder="Select Store..."
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <AppSelect
                                            onChange={(selectedOption) =>
                                                handleCellChange(row.id, 'ClientRef2', selectedOption || '')
                                            }
                                            
                                            options={invDrp}
                                            className="basic-single text-sm"
                                            classNamePrefix="pd-select"
                                            value={{
                                                value: row.ClientRef2,
                                                label: row.ClientRef2
                                            }}
                                            isSearchable
                                            style={{ width: "5vw" }}
                                            placeholder="Select Invoice..."
                                        />
                                    </td>
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
                                            value={row.Debit}
                                            onChange={(raw) => handleCellChange(row.id, "Debit", raw)}
                                            className="border p-1 w-full"
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <AmountInput
                                            value={row.Credit}
                                            onChange={(raw) => handleCellChange(row.id, "Credit", raw)}
                                            className="border p-1 w-full"
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <input
                                            type="text"
                                            value={row.Narration}
                                            onChange={e => handleCellChange(row.id, "Narration", e.target.value)}
                                            className="border p-1 w-full"
                                        />
                                    </td>

                                    <td className="border p-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.id)}
                                            className="pd-btn-icon-danger"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                        <tfoot className="pd-bg-muted font-semibold">
                            <tr>
                                <td className="border p-2 text-right">Total</td>
                                <td colSpan="3" className="border p-2">Diffrence {formatAmount((TotalDebit).toFixed(2) - (TotalCredit).toFixed(2))}</td>
                                <td className="border p-2 text-right tabular-nums">{formatAmount(TotalDebit)}</td>
                                <td className="border p-2 text-right tabular-nums">{formatAmount(TotalCredit)}</td>
                                <td className="border p-2"></td>
                                <td className="border p-2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Amount in words */}
        <div className="mb-10">
            <div className="border-l-4 border-slate-700 pl-4 py-1">
                <p className="text-xs uppercase tracking-[0.25em] pd-text-muted font-bold mb-2">
                    Amount in Words
                </p>
                <p className="font-medium pd-text-body leading-7 tracking-wide">
                    {amountToWords(TotalDebit)}
                </p>
            </div>
        </div>

                {/* ACTIONS */}
                <div className="flex justify-between mt-4">
                    <button type="button" onClick={addNewRow} className="pd-btn-success px-4 py-2">
                        Add Row
                    </button>
                    <button
                        type="submit"
                        disabled={disabled}
                        className="pd-btn-save disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {disabled ? (
                            <>
                                <CircularProgress size={18} color="inherit" />
                                <span>Updating...</span>
                            </>
                        ) : (
                            "Update Voucher"
                        )}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default JournalVoucherEdit;
