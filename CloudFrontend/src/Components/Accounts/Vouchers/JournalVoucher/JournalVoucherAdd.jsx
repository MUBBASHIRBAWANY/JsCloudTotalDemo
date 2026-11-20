import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppAsyncSelect from '../../../Global/AppAsyncSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

const shownTotal = (value) => Number(String(formatAmount(value)).replace(/,/g, "")) || 0;

const JournalVoucherAdd = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();
    const copyFromId = searchParams.get('copyFrom');
    const copyAppliedRef = useRef(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllVoucherDependencies(dispatch)
            .then(() => setLoading(false))
            .catch(() => setLoading(false));
    }, [dispatch]);
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const employeeAccounts = useEmployeeSubAccounts()
    const Reamin = useSelector((state) => state.Remaininginvoice.Remaininginvoice)
    const OpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);
    const newOpen = OpeningInvoices.filter((item)=> item.RemaingAmount > 0)
    const AllInvoice1 = useMemo(() => Reamin.concat(OpeningInvoices), [Reamin, newOpen])
    
    const [AllInvoice , setAllInvoice] = useState([])
    const [selectedClientId, setSelectedClientId] = useState(null)
    
    const Transport = useSelector((state) => state.Transport.Transport)
    const City = useSelector((state) => state.City.City)
    const filteredAccount = useMemo(
        () => excludeControlAccounts(
            (Account || []).filter((item) => item.AccountCode?.length > 5),
            Admin
        ),
        [Account, Admin]
    )
        const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher)
    
    const Client1 = useSelector((state) => state.Client.client)
    const Client = useMemo(() => Client1.map((item) => ({
        ...item,
        DistrbutorName: item.DistrbutorName + ` (${City.find((c) => c._id === item.City)?.CityName || ''})`
    })), [Client1, City]);
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const [voucherType, setVoucherType] = useState("JV")
    const [disabled, setDisabled] = useState(false)
    const [tableData, setTableData] = useState([]);
    const [invDrp, setInvDrp] = useState([])
    const [ClientInv, setClientInv] = useState([])
    const SoftStore = useSelector((state) => state.Store.Store)
    const store = useMemo(() => [{
        _id: "0",
        StoreName: "Head Office",
        StoreCode: "HO"
    }].concat(SoftStore), [SoftStore])



    const ALLStore = useMemo(() => store.map((item) => ({
        label: `${item.StoreName}`,
        value: item._id
    })), [store])



    const getAccountOption = useCallback((clientid, accountId, transporterId, subAccountId) => {
        const employeeOpt = employeeAccountOption(employeeAccounts, subAccountId);
        if (employeeOpt) return employeeOpt;
        const cust = Client.find((item) => String(item._id) === String(clientid))
        if (cust) {
            return {
                value: cust._id,
                label: `${cust.AccountCode || cust.SalesFlowRef || cust.OldCode || ""} ${cust.CutomerName || cust.DistrbutorName || ""}`,
                code: cust.AccountCode || cust.SalesFlowRef
            };
        }

        const transporter = Transport.find((item) => String(item._id) === String(transporterId))
        if (transporter) {
            return {
                value: transporter._id,
                label: `${transporter.TransporterName || ""} Transport`,
                code: transporter.AccountCode || ""
            };
        }

        if (!accountId) return null;
        const acc = Account.find(a => String(a._id) === String(accountId));
        if (!acc) return null;

        return {
            value: acc._id,
            label: `${acc.AccountCode} ${acc.AccountName}`,
            code: acc.AccountCode
        };
    }, [Client, Account, Transport, employeeAccounts]);

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
            label: `${item.AccountCode || item.SalesFlowRef || item.OldCode || ""} ${item.AccountName || item.CutomerName || item.DistrbutorName || item.TransporterName + "Transport" || ""}`,
            value: item._id,
            code: item.AccountCode || item.SalesFlowRef
        })), employeeAccounts, search);
    }, [filteredAccount, Client, Transport, employeeAccounts]);


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
    }, []);    // When OpeningInvoices or Reamin load async, refresh the invoice dropdown if a client is already selected
    useEffect(() => {
        if (selectedClientId) {
            const ClientInvoice = AllInvoice1.filter((item) => item.Client == selectedClientId || item.Distrbutor == selectedClientId)
            const DrpCutInv = ClientInvoice.map((item) => ({
                label: `${item.SalesInvoice || item.DitributorInvoiceCode}  ${item.SalesFlowRef || ""} || ${item.Invoice || ""}` ,
                value: item.SalesInvoice || item.DitributorInvoiceCode || item.Invoice,
            }))
            DrpCutInv.push({ label: "Advance", value: "Advance" })
            setInvDrp(DrpCutInv)
            setClientInv(ClientInvoice)
        }
    }, [AllInvoice1, selectedClientId])

    const handleCellChange = useCallback((id, field, value) => {
        setTableData((prev) => {
            let newTableData = [...prev];

            const rowIndex = newTableData.findIndex(row => row.id === id);
            if (rowIndex === -1) return prev;

            let updatedRow = { ...newTableData[rowIndex], [field]: value };


            // Reset debit/credit if no account
            if (updatedRow.Account === "") {
                updatedRow.Account = "";
                updatedRow.Client = "";
                updatedRow.Debit = 0;
                updatedRow.Credit = 0;
                updatedRow.ClientRef2 = "";
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
                updatedRow.Account = "";
                updatedRow.Client = "";
                updatedRow.Debit = 0;
                updatedRow.Credit = 0;
                updatedRow.ClientRef2 = "";
                const clientAccount = Client.find((item) => item._id === value)?._id
                const transportAccount = Transport.find((item) => item._id === value)?._id
                if (clientAccount) {
                    try {
                        setSelectedClientId(clientAccount)
                        const ClientInvoice = AllInvoice1.filter((item) => item.Client == clientAccount || item.Distrbutor == clientAccount)
                        updatedRow.Account = Admin?.Client,
                            updatedRow.Client = clientAccount
                        setClientInv(ClientInvoice)

                        const DrpCutInv = ClientInvoice.map((item) => ({
                            label: `${item.SalesInvoice || item.DitributorInvoiceCode}  ${item.SalesFlowRef || ""} || ${item.Invoice || ""}` ,
                            value: item.SalesInvoice || item.DitributorInvoiceCode || item.Invoice,
                        }))
                        DrpCutInv.push({
                            label: "Advance",
                            value: "Advance",
                        })
                        setInvDrp(DrpCutInv)
                        updatedRow.ClientLine = "true"
                        updatedRow.ClientRef2 = "Advance"
                    } catch (err) {
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
                if(value.value !== "Advance"){

                    const RemainInvAmt = AllInvoice1.find((val) => val.SalesInvoice === value.value || val.DitributorInvoiceCode === value.value || val.Invoice === value.value )
                    console.log(RemainInvAmt)
                    if(RemainInvAmt.RemaingAmount){
                    updatedRow.Type = "Opening"
                }
                else { 
                    updatedRow.Type =  "Current";
                }
                updatedRow.Credit = RemainInvAmt?.RemainingAmount ||  RemainInvAmt.Remaining || RemainInvAmt.RemaingAmount || 0
                updatedRow.store = RemainInvAmt.Store 
                
            }
        }

            // Update row in the new table data
            newTableData[rowIndex] = updatedRow;

            // Finally, update state
            return newTableData;
        });
    }, [Admin, Client, ClientInv, AllInvoice, Transport, AllInvoice1, employeeAccounts]);




    const TotalDebit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0), [tableData]);
    const TotalCredit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0), [tableData]);
    const ShownDebit = useMemo(() => shownTotal(TotalDebit), [TotalDebit]);
    const ShownCredit = useMemo(() => shownTotal(TotalCredit), [TotalCredit]);
    // const onSubmit = async (data) => {
    //     if (disabled) return;
    //     setDisabled(true);

    //     if (validateClosingMonth(data.VoucherDate, loginVendor)) {
    //         setDisabled(false);
    //         return;
    //     }

    //     // Check: every row must have store selected
    //     const rowWithoutStore = tableData.find(row => !row.store);
    //     if (rowWithoutStore) {
    //         setDisabled(false);
    //         return toast.error("Store is required for every row");
    //     }

    //     // Check: Client row with Credit must have ClientRef2
    //     const clientCreditWithoutRef = tableData.find(
    //         (row) => (row.Client || row.ClientLine === "true") && Number(row.Credit) > 0 && !String(row.ClientRef2 || row.Ref || "").trim()
    //     );
    //     if (clientCreditWithoutRef) {
    //         setDisabled(false);
    //         return toast.error("Client row on Credit side must have an Invoice Reference (Ref)");
    //     }

    //     // Attach table data
    //     data.VoucharData = tableData;
    //     data.status = "False";

    //     try {
    //         // 📅 Extract Year & Month
    //         const date = new Date(data.VoucherDate);
    //         const year = date.getFullYear();
    //         const month = String(date.getMonth() + 1).padStart(2, "0");

    //         const voucherType = "JV";
    //         const prefix = `${voucherType}${year}${month}`; // JV202605
    //         // 🔍 Get last voucher
    //         const code = await createDataFunction(
    //             `/Voucher/GetLastVouherByDate/${voucherType}?Voucherdate=${data.VoucherDate}`, {prefix : prefix});

    //         let serial = 1;
    //         if (code && code.length > 0) {
    //             const lastVoucher = code[0]?.VoucherNumber;

    //             if (lastVoucher && lastVoucher.startsWith(prefix)) {
    //                 const lastSerial = parseInt(lastVoucher.slice(8), 10); // after JVYYYYMM
    //                 serial = isNaN(lastSerial) ? 1 : lastSerial + 1;
    //             }
    //         }

    //         // 🎯 Final Voucher Number
    //         data.VoucherNumber = `${prefix}${String(serial).padStart(4, "0")}`;

    //         // 🧾 Voucher Type
    //         data.VoucherType = voucherType;
    //         data.status = "Post"
    //         // Same numbers the footer prints. Raw sums can differ by float dust
    //         // while the screen shows one total.
    //         data.TotalDebit = ShownDebit;
    //         data.TotalCredit = ShownCredit;

    //         if (ShownDebit !== ShownCredit) {
    //             setDisabled(false);
    //             return toast.error("Debit and Credit must be equal");
    //         }

    //         // 📄 Invoice Mapping
    //         const invoiceData = tableData
    //             .filter((item) => item.ClientLine === "true")
    //             .map((inv) => ({
    //                 amount: inv.Credit,
    //                 inv: inv.ClientRef2,
    //             }));

    //         data.invoiceData = invoiceData;

    //         // 🚀 Save
    //         const res = await createDataFunction("/Voucher", data);
    //         const allVoucher = EditVoucher;
    //         const totalVoucher = [...allVoucher, res.voucher];
    //         dispatch(fetchVoucher(allVoucher || []));

    //         toast.success("Journal Voucher Created Successfully");

    //         setTimeout(() => {
    //             navigate(`/JournalVoucherView/${res.voucher._id}`);
    //         }, 1000);

    //     } catch (err) {
    //         setDisabled(false);

    //         if (err?.response?.status === 401) {
    //             toast.error(err.response.data.message);
    //         }
    //         else if (err?.response?.data?.message) {
    //             toast.error(err.response.data.message);
    //         }
    //          else {
    //             console.error(err);
    //             toast.error("Something went wrong");
    //         }
    //     }
    // };
   const onSubmit = async (data) => {
    if (disabled) return;
    setDisabled(true);

    if (validateClosingMonth(data.VoucherDate, loginVendor)) {
        setDisabled(false);
        return;
    }

    // Check: every row must have store selected
    const rowWithoutStore = tableData.find((row) => !row.store);
    if (rowWithoutStore) {
        setDisabled(false);
        return toast.error("Store is required for every row");
    }

    // Check: Client row with Credit must have ClientRef2
    const clientCreditWithoutRef = tableData.find(
        (row) =>
            (row.Client || row.ClientLine === "true") &&
            Number(row.Credit) > 0 &&
            !row.ClientRef2
    );
    if (clientCreditWithoutRef) {
        setDisabled(false);
        return toast.error("Client row on Credit side must have an Invoice Reference (Ref)");
    }

    // 🔢 Totals (float-safe, 2 decimals) - API call se pehle check
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

    const TotalDebit = round2(
        tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0)
    );
    const TotalCredit = round2(
        tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0)
    );

    if (TotalDebit !== TotalCredit) {
        setDisabled(false);
        return toast.error("Debit and Credit must be equal");
    }

    // ───────────── STEP 1: Voucher save ─────────────
    let res;
    try {
        // 📅 Extract Year & Month
        const date = new Date(data.VoucherDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");

        const voucherType = "JV";
        const prefix = `${voucherType}${year}${month}`; // JV202605

        // 🔍 Get last voucher
        const code = await createDataFunction(
            `/Voucher/GetLastVouherByDate/${voucherType}?Voucherdate=${data.VoucherDate}`,
            { prefix: prefix }
        );

        let serial = 1;
        if (code && code.length > 0) {
            const lastVoucher = code[0]?.VoucherNumber;

            if (lastVoucher && lastVoucher.startsWith(prefix)) {
                const lastSerial = parseInt(lastVoucher.slice(8), 10); // after JVYYYYMM
                serial = isNaN(lastSerial) ? 1 : lastSerial + 1;
            }
        }

        // 🎯 Final payload
        data.VoucherNumber = `${prefix}${String(serial).padStart(4, "0")}`;
        data.VoucherType = voucherType;
        data.status = "Post";
        data.VoucharData = tableData;
        data.TotalDebit = TotalDebit;
        data.TotalCredit = TotalCredit;

        // 📄 Invoice Mapping
        data.invoiceData = tableData
            .filter((item) => item.ClientLine === "true")
            .map((inv) => ({
                amount: inv.Credit,
                inv: inv.ClientRef2,
            }));

        // 🚀 Save
        res = await createDataFunction("/Voucher", data);
    } catch (err) {
        // Sirf SAVE se pehle/dauran ka error yahan aata hai
        setDisabled(false);
        console.error(err);
        toast.error(err?.response?.data?.message || "Something went wrong");
        return;
    }

    // ───────────── STEP 2: Voucher save ho chuka hai ─────────────
    // Ab yahan kuch bhi fail ho, redirect nahi rukna chahiye
    // aur setDisabled(false) nahi karna (warna duplicate voucher ban sakta hai)
    const savedVoucher = res?.voucher;
    const voucherId = savedVoucher?._id;

    try {
        const allVoucher = Array.isArray(EditVoucher) ? EditVoucher : [];
        dispatch(
            fetchVoucher(savedVoucher ? [...allVoucher, savedVoucher] : allVoucher)
        );
    } catch (e) {
        console.error("Voucher list refresh failed:", e);
    }

    if (!voucherId) {
        console.error("Unexpected /Voucher response:", res);
        return toast.error("Voucher saved, but could not open it. Please check the voucher list.");
    }

    toast.success("Journal Voucher Created Successfully");
    navigate(`/JournalVoucherView/${voucherId}`);
};
    useEffect(() => {
        if (copyFromId) return;
        const today = new Date();
        const formatted = today.toISOString().split("T")[0]; // YYYY-MM-DD
        reset({
            VoucherDate: formatted
        })
    }, [copyFromId, reset]);

    useEffect(() => {
        if (!copyFromId || loading || copyAppliedRef.current) return;

        const asId = (val) => {
            if (!val) return val;
            if (typeof val === "object") return val._id || "";
            return val;
        };

        const applyCopiedVoucher = (voucherData) => {
            if (!voucherData) return;
            copyAppliedRef.current = true;
            const voucherDate = typeof voucherData.VoucherDate === "string"
                ? voucherData.VoucherDate.split("T")[0]
                : new Date().toISOString().split("T")[0];
            reset({
                VoucherDate: voucherDate,
                Remarks: voucherData.Remarks || "",
                Cheque: voucherData.Cheque || "",
            });
            const rows = (voucherData.VoucharData || []).map((row, index) => {
                const clientId = asId(row.Client);
                return {
                    id: Date.now() + index,
                    Account: asId(row.Account) || "",
                    Client: clientId,
                    EBF: asId(row.EBF),
                    Loan: asId(row.Loan),
                    Advance: asId(row.Advance),
                    BadDebt: asId(row.BadDebt),
                    Transporter: asId(row.Transporter),
                    store: asId(row.store) || "",
                    vendor: asId(row.vendor),
                    ClientRef2: row.ClientRef2,
                    ClientLine: row.ClientLine || (clientId ? "true" : undefined),
                    Type: row.Type,
                    Slip: row.Slip || "",
                    Debit: row.Debit || 0,
                    Credit: row.Credit || 0,
                    Narration: row.Narration || "",
                };
            });
            setTableData(rows);

            const clientRow = rows.find((r) => r.Client);
            if (clientRow?.Client) {
                setSelectedClientId(clientRow.Client);
            }
        };

        const fromRedux = (EditVoucher || []).find((v) => String(v._id) === String(copyFromId));
        if (fromRedux) {
            applyCopiedVoucher(fromRedux);
            return;
        }

        let cancelled = false;
        getDataFundtion(`/Voucher/VoucherByID/${copyFromId}`)
            .then((res) => {
                if (cancelled) return;
                applyCopiedVoucher(res?.voucher || res?.data);
            })
            .catch((err) => {
                console.error(err);
                toast.error("Failed to load voucher to copy");
            });

        return () => { cancelled = true; };
    }, [copyFromId, loading, EditVoucher, reset]);

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

    const VoucherType = useMemo(() => [{
        value: "Jv",
        label: "Jv Journal Voucher",
    }
    ], [])
    return (
        <div className="p-4">
            <GlobalLoader loading={loading} message="Loading Journal Voucher..." />
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Journal Voucher</h1>


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

                <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr className="pd-bg-muted">
                                <th className="border p-2" style={{ width: "30vw" }}>Account / Client</th>
                                <th className="border p-2" style={{ width: "6vw" }}>Store</th>
                                <th className="border p-2" style={{ width: "6vw" }}>InvRef</th>
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
                                            <AppAsyncSelect
                                                loadOptions={loadAccounts}
                                                defaultOptions={startingAccount}   // ✔ correct
                                                isClearable
                                                isSearchable
                                                placeholder="Select Account..."
                                                className="basic-single text-sm"
                                                classNamePrefix="pd-select"
                                                value={getAccountOption(row.Client, row.Account, row.Transporter, employeeLineId(row))}
                                                onChange={(option) =>
                                                    handleCellChange(row.id, 'Account', option?.value || '')
                                                }
                                            />

                                        </td>
                                        <td>
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
                                        <td>
                                            <AppSelect
                                                onChange={(selectedOption) =>
                                                    handleCellChange(row.id, 'ClientRef2', selectedOption || '')
                                                }

                                                options={invDrp}
                                                className="basic-single text-sm"
                                                classNamePrefix="pd-select"
                                                value={row.ClientRef2 ? {
                                                    value: row.ClientRef2,
                                                    label: row.ClientRef2
                                                } : null}
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
                                    <td className="border p-2">Difference {formatAmount(ShownDebit - ShownCredit)}</td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2 hidden md:table-cell text-right tabular-nums">{formatAmount(ShownDebit)}</td>
                                    <td className="border p-2 hidden md:table-cell text-right tabular-nums">{formatAmount(ShownCredit)}</td>
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
                        className="pd-btn-success px-4 py-2 text-sm md:text-base"
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
                            "Create Journal Voucher"
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default JournalVoucherAdd
