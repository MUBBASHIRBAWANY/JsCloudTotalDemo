import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppAsyncSelect from '../../../Global/AppAsyncSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../../Api/CRUDFunctions';
import { rangeBetween } from '../../../Global/GenrateCode';
import AppSelect from '../../../Global/AppSelect.jsx'
import AmountInput from '../../../Global/AmountInput.jsx'
import { formatAmount } from '../../../../utils/amountToWords.js'
import { logTransaction } from '../logTransaction';
import { validateClosingMonth } from '../../../Global/validateClosingMonth';
import { fetchVoucher } from '../../../../Redux/Reducers/VoucherReducer.js';
import GlobalLoader from '../../../Global/GlobalLoader.jsx';
import { fetchAllVoucherDependencies } from '../fetchVoucherDependencies.js';
import { clearEmployeeSubAccount, employeeAccountOption, employeeLineId, takeEmployeeVoucherLine, useEmployeeSubAccounts, withEmployeeAccountOptions } from '../employeeSubAccounts.js';
import { excludeControlAccounts, isDirectClientControl, isDirectTransporterPayable } from '../voucherControlAccounts.js';
import { CircularProgress } from '@mui/material';

const ONLINE_CHEQUE = { value: "Online", label: "Online" };

const BankPaymentVoucherAdd = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();
    const copyFromId = searchParams.get('copyFrom');
    const copyAppliedRef = useRef(false);
    const [loading, setLoading] = useState(true);
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const Vendor = useSelector((state) => state.Vendor.state)
    const BankAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer)
    const employeeAccounts = useEmployeeSubAccounts()
    const Transport = useSelector((state) => state.Transport.Transport)
    const City = useSelector((state) => state.City.City)
    const Client1 = useSelector((state) => state.Client.client)
    const Client = useMemo(() => (Client1 || []).map((item) => ({
        ...item,
        DistrbutorName: item.DistrbutorName + ` (${City.find((c) => c._id === item.City)?.CityName || ''})`
    })), [Client1, City]);
    const filteredAccount = useMemo(
        () => excludeControlAccounts(
            (Account || []).filter((item) => item.AccountCode?.length > 5),
            BankAccountNumber
        ),
        [Account, BankAccountNumber]
    )
    const ChqBook = useSelector((state) => state.ChqBook.ChqBook)
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const [disabled, setDisabled] = useState(false)
    const SoftStore = useSelector((state) => state.Store.Store)
    const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher)
    const store = useMemo(() => [{
        _id: "0",
        StoreName: "Head Office",
        StoreCode: "HO"
    }].concat(SoftStore), [SoftStore])

    const result = useMemo(() => {
        const arr = [];
        if (BankAccountNumber?.BankAccountFrom != null && BankAccountNumber?.BankAccountTo != null) {
            for (let i = BankAccountNumber.BankAccountFrom; i <= BankAccountNumber.BankAccountTo; i++) {
                arr.push(i.toString().padStart(5, '0'));
            }
        }
        return arr;
    }, [BankAccountNumber?.BankAccountFrom, BankAccountNumber?.BankAccountTo])


    const AllVendorDrp = useMemo(() => Account.filter((Acc) => Acc._id == BankAccountNumber.WithholdingTax).concat(Vendor), [Account, Vendor, BankAccountNumber.WithholdingTax])
    const AllVendor = useMemo(() => AllVendorDrp.map((item) => ({
        label: `${item.VendorName || item.AccountName} `,
        value: item._id
    })), [AllVendorDrp])

    const ALLStore = useMemo(() => store.map((item) => ({
        label: `${item.StoreName}`,
        value: item._id
    })), [store])
    const login = useSelector((state) => state.LoginerReducer.state)
    const Bank = useMemo(() => filteredAccount.filter((item) => result.some(prefix => item.AccountCode.startsWith(prefix))), [filteredAccount, result])
    const [MainAccount, setMainAccount] = useState("");
    const [tableData, setTableData] = useState([]);
    const [PaidFor, setPaidFor] = useState("vendor");
    const [unUsedChq, setUnuseChq] = useState([ONLINE_CHEQUE])
    const [chq, setChq] = useState(ONLINE_CHEQUE)
    const [vendorStore, setVendorStore] = useState([])

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
    }, [filteredAccount, Client, Transport, employeeAccounts])
    const BankAccount = useMemo(() => Bank.map((item) => ({
        label: `${item.AccountCode} ${item.AccountName}`,
        value: item._id
    })), [Bank])
    const startingAccount = useMemo(() => filteredAccount.slice(0, 50).map((item) => ({
        label: `${item.AccountCode} ${item.AccountName}`,
        value: item._id,
        code: item.AccountCode
    })), [filteredAccount])

    const getAccountOption = (clientId, accountId, transporterId, subAccountId) => {
        const employeeOpt = employeeAccountOption(employeeAccounts, subAccountId);
        if (employeeOpt) return employeeOpt;
        const cust = Client.find((item) => item._id == clientId);
        if (cust) {
            return {
                value: cust._id,
                label: `${cust.AccountCode || cust.SalesFlowRef || cust.OldCode || ""} ${cust.CutomerName || cust.DistrbutorName || ""}`,
                code: cust.AccountCode || cust.SalesFlowRef
            };
        }
        const transport = Transport.find((item) => item._id == transporterId);
        if (transport) {
            return {
                value: transport._id,
                label: `${transport.OldCode || ""} ${transport.TransporterName || ""}Transport`,
                code: transport.OldCode
            };
        }
        if (!accountId) return null;
        const acc = Account.find((a) => a._id === accountId);
        if (!acc) return null;
        return {
            value: acc._id,
            label: `${acc.AccountCode} ${acc.AccountName}`,
            code: acc.AccountCode
        };
    };
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
        setTableData((prev) => prev.map(row => {
            if (row.id === id) {

                let updatedRow = { ...row, [field]: value };
                const checking = tableData.find((item) => item.id == id)
                if (field == "vendor") {
                    const checkWth = Account.find((item) => item._id == value.value)

                    if (checkWth) {
                        updatedRow.Account = checkWth._id
                        updatedRow.vendor = ""
                        updatedRow.show = true
                        updatedRow.Narration = tableData.length !== 0 ? tableData[0].Narration : ""
                    }
                    else {
                        //console.log(updatedRow)
                        updatedRow.Account = BankAccountNumber.Vendor
                        updatedRow.vendor = value.value
                        updatedRow.show = false
                        updatedRow.store = ""
                        updatedRow.Narration = tableData[0].Vendor !== undefined ? tableData[0].Narration : `Paid Cheque ${chq.label} from ${Account.find((c) => c._id === MainAccount)?.AccountName} to ${value.label} / ${SoftStore.find((item) => item._id == updatedRow.store)?.StoreName || ""}`
                    }
                    const someStore = Vendor.find((item) => item._id == value.value)?.Store;
                    if (someStore) {
                        const storeForVendor = SoftStore.filter((item) => someStore.includes(item._id))
                            .map((s) => ({
                                label: `${s.StoreName}`,
                                value: s._id
                            }))
                        setVendorStore(storeForVendor)
                    }
                    else {
                        const AllStore = SoftStore.map((item) => ({
                            label: `${item.StoreName}`,
                            value: item._id
                        }))
                        setVendorStore(AllStore)
                    }


                }

                if (field == "store") {
                    updatedRow.store = value.value
                    //console.log(tableData[0].vendor)
                    updatedRow.Narration = tableData[0].vendor !== undefined ? `Paid Cheque ${chq.label} from ${Account.find((c) => c._id === MainAccount)?.AccountName} to ${Vendor.find((item) => item._id == tableData[0].vendor)?.VendorName} / ${value.label}` : ""
                }

                if (field == "Account") {
                    const employeeLine = takeEmployeeVoucherLine(updatedRow, value, BankAccountNumber, employeeAccounts);
                    if (employeeLine.handled) {
                        if (employeeLine.error) {
                            toast.error(employeeLine.error);
                            return row;
                        }
                        updatedRow = { ...employeeLine.row, Debit: 0, Credit: 0 };
                    } else {
                    updatedRow = clearEmployeeSubAccount(updatedRow);
                    // Prevent direct entry into Client account
                    if (isDirectClientControl(value, BankAccountNumber)) {
                        toast.error("Ap client main entry karin");
                        return prev;
                    }
                    if (isDirectTransporterPayable(value, BankAccountNumber)) {
                        toast.error("Ap transporter select karin — Transporter Payable direct select nahi hoga");
                        return prev;
                    }
                    if (value === MainAccount) {
                        toast.error("You cannot select the main account as a transaction account");
                        updatedRow.Account = "";
                    } else if (value === "") {
                        updatedRow.Account = "";
                        updatedRow.Client = "";
                        updatedRow.Transporter = "";
                    } else {
                        updatedRow.Account = "";
                        updatedRow.Client = "";
                        updatedRow.Transporter = "";

                        const clientAccount = Client.find((item) => item._id === value)?._id;
                        const transportAccount = Transport.find((item) => item._id === value)?._id;

                        if (clientAccount) {
                            updatedRow.Account = BankAccountNumber?.Client;
                            updatedRow.Client = clientAccount;
                            updatedRow.ClientLine = "true";
                        } else if (transportAccount) {
                            updatedRow.Account = BankAccountNumber?.TransporterPayable;
                            updatedRow.Transporter = transportAccount;
                        } else {
                            updatedRow.Account = value;
                        }
                    }
                    }
                }
                if (field == "Debit") {
                    updatedRow.Debit = value
                    updatedRow.Credit = 0
                }
                if (field == "Credit") {
                    updatedRow.Credit = value
                    updatedRow.Debit = 0
                }
                if (field == "Ref") {
                    updatedRow.Ref = value
                }


                return updatedRow;
            }
            return row;
        }));
    }, [Account, BankAccountNumber, MainAccount, Vendor, SoftStore, chq, tableData, Client, Transport, employeeAccounts]);


    const TotalDebit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0), [tableData]);
    const TotalCredit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0), [tableData]);

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

    const value = TotalDebit - TotalCredit;

    if (value <= 0) {
        setDisabled(false);
        return toast.error("Credit Account Not Be Zero");
    }

    // ✅ Create updated table data (avoid mutating original)
    const updatedTableData = [
        ...tableData,
        {
            id: Date.now(),
            Account: MainAccount,
            Credit: value,
            Narration: tableData[0]?.Narration,
            show: true,
            store: tableData[0]?.store
        }
    ];

    data.PaidFor = PaidFor;
    data.VoucharData = updatedTableData;
    data.VoucherMainAccount = MainAccount;
    data.Status = "false";

    try {
        // 📅 Extract Year & Month
        const date = new Date(data.VoucherDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        const voucherType = "BP";
        const prefix = `${voucherType}${year}${month}`; // BP202605

        // 🔍 Get last voucher
        const code = await getDataFundtion(`/Voucher/GetLastVouher/BP?Voucherdate=${data.VoucherDate}`, prefix);

        let serial = 1;

        if (code && code.length > 0) {
            const lastVoucher = code[0]?.VoucherNumber;

            if (lastVoucher && lastVoucher.startsWith(prefix)) {
                const lastSerial = parseInt(lastVoucher.slice(8), 10); // after BPYYYYMM
                serial = isNaN(lastSerial) ? 1 : lastSerial + 1;
            }
        }

        // 🎯 Final Voucher Number
        data.VoucherNumber = `${prefix}${String(serial).padStart(4, '0')}`;

        // 🧾 Other fields
        data.VoucherType = voucherType;
        data.TotalDebit = TotalDebit;
        data.TotalCredit = TotalCredit;
        data.ChequeNumber = chq?.label || "";
        data.ChequeBook = chq?.value || "";

        const UsedCheque = {
            chqNumber: [chq?.label],
            Status: "used",
        };

        setShow(true);

        // 🚀 Save Voucher
        const res = await createDataFunction("/Voucher", data);
        console.log(res)
        const allVoucher = EditVoucher;
        const totalVoucher = [...allVoucher, res.voucher];
        dispatch(fetchVoucher(allVoucher || []))
        // 📝 Log transaction
        await logTransaction({
            data,
            loginVendor,
            type: 'Bank Payment Voucher',
        });

        // 🏦 Update cheque status
      

        toast.success("Bank Payment Voucher Created Successfully");

        setTimeout(() => {
            navigate(`/BankPaymentVoucherView/${res.voucher._id}`); // Navigate to view page
        }, 1000);

    } catch (err) {
        setDisabled(false);

        if (err?.response?.status === 401) {
            console.log("Unauthorized:", err);
        } else {
            console.error(err);
            toast.error("Something went wrong");
        }
    }
};
    const SetDrp = (val) => {
        setMainAccount(val)
        setUnuseChq([])
        setChq(ONLINE_CHEQUE)
        const AllChq = ChqBook.filter((item) => item.Bank == val)
            .map((item1) => ({
                id: item1._id,
                chqs: item1.Cheuques[0]
            })).flat()
        const arr = []
        const combined = AllChq.flatMap((item, index) => {
            const id = item._id || item.id;
            Object.entries(item)
            arr.push({
                ref: item.id,
                chq: item.chqs

            })

        });
        let result = [];
        arr.forEach(obj => {
            (Array.isArray(obj.chq) ? obj.chq : []).forEach(innerObj => {
                result.push({
                    ref: obj.ref,
                    chq: innerObj.chq,
                    status: innerObj.status
                });
            });
        });
        const unUsedchq = result.filter((item) => item.status == "unUsed")
            .map((ch) => ({
                value: ch.ref,
                label: ch.chq
            }))
        const online = [ONLINE_CHEQUE].concat(unUsedchq)
        setUnuseChq(online)
        return online
    }
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
            const mainId = asId(voucherData.VoucherMainAccount) || "";
            const voucherDate = typeof voucherData.VoucherDate === "string"
                ? voucherData.VoucherDate.split("T")[0]
                : new Date().toISOString().split("T")[0];
            const paidFor = voucherData.PaidFor || "vendor";
            reset({
                VoucherDate: voucherDate,
                PaidTo: voucherData.PaidTo || "",
            });
            const rows = (voucherData.VoucharData || voucherData.VoucherData || [])
                .filter((row) => !mainId || String(asId(row.Account) || "") !== String(mainId))
                .map((row, index) => {
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
                        vendor: asId(row.vendor) || "",
                        ClientLine: row.ClientLine || (clientId ? "true" : undefined),
                        show: row.show == true,
                        Ref: row.Ref || "",
                        Debit: row.Debit || 0,
                        Credit: row.Credit || 0,
                        Narration: row.Narration || "",
                    };
                });
            setPaidFor(paidFor);
            const chequeOptions = SetDrp(mainId) || [];
            const chequeNumber = String(voucherData.ChequeNumber || "");
            const chequeBook = String(asId(voucherData.ChequeBook) || "");
            const matchedCheque = chequeNumber
                ? chequeOptions.find((opt) => String(opt.label) === chequeNumber && (!chequeBook || chequeBook === "Online" || String(opt.value) === chequeBook))
                : null;
            setChq(matchedCheque || "");
            if (chequeNumber && chequeNumber !== "Online" && !matchedCheque) {
                toast.info("Previous cheque is already used. Select a new cheque.");
            }
            setTableData(rows);

            if (paidFor === "vendor") {
                const vendorIds = rows.map((row) => row.vendor).filter(Boolean);
                const collected = [];
                const seen = new Set();
                vendorIds.forEach((vendorId) => {
                    const someStore = (Vendor || []).find((item) => String(item._id) === String(vendorId))?.Store;
                    const source = someStore?.length
                        ? (SoftStore || []).filter((item) => someStore.some((storeId) => String(storeId) === String(item._id)))
                        : (SoftStore || []);
                    source.forEach((item) => {
                        if (seen.has(String(item._id))) return;
                        seen.add(String(item._id));
                        collected.push({ label: item.StoreName, value: item._id });
                    });
                });
                setVendorStore(collected.length
                    ? collected
                    : (SoftStore || []).map((item) => ({ label: item.StoreName, value: item._id })));
            }
        };

        const fromRedux = (EditVoucher || []).find((v) => String(v._id) === String(copyFromId));
        if (fromRedux && (fromRedux.VoucharData || fromRedux.VoucherData)) {
            applyCopiedVoucher(fromRedux);
            return;
        }

        let cancelled = false;
        getDataFundtion(`/Voucher/VoucherByID/${copyFromId}`)
            .then((res) => {
                if (cancelled) return;
                const voucher = res?.voucher || res?.data;
                if (!voucher || (!voucher.VoucharData && !voucher.VoucherData && !voucher.VoucherMainAccount)) {
                    toast.error("Failed to load voucher to copy");
                    return;
                }
                applyCopiedVoucher(voucher);
            })
            .catch((err) => {
                console.error(err);
                toast.error("Failed to load voucher to copy");
            });

        return () => { cancelled = true; };
    }, [copyFromId, loading, EditVoucher, reset, Vendor, SoftStore, ChqBook]);

    useEffect(() => {
        fetchAllVoucherDependencies(dispatch)
            .then(() => setLoading(false))
            .catch((err) => {
                console.error(err);
                toast.error("Failed to load voucher data");
                setLoading(false);
            });
    }, [dispatch]);

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
    return (
        <div className="p-4">
            <GlobalLoader loading={loading} message="Loading Bank Payment Voucher..." />
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Bank Paymnet Voucher</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Voucher Date </label>
                        <input
                            type="date"
                            disabled={loginVendor.BranchUser == "true" ? true : false}
                            style={{ height: "38px" }}
                            {...register("VoucherDate", { required: true })}
                            className="pd-input text-sm md:text-base"
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Credit Account </label>
                        <AppSelect
                            onChange={(selectedOption) => SetDrp(selectedOption.value)}
                            options={BankAccount}
                            value={MainAccount ? {
                                value: `${MainAccount}`,
                                label: `${Account.find((c) => c._id === MainAccount)?.AccountCode} ${Account.find((c) => c._id === MainAccount)?.AccountName}`
                            } : null}
                            className="basic-single text-sm"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select credit account..."
                        />
                    </div>

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
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Cheque </label>
                        <AppSelect
                            onChange={(selectedOption) => setChq(selectedOption)}
                            options={unUsedChq}
                            value={chq ? {
                                value: `${chq.value}`,
                                label: `${chq.label}`
                            } : null}
                            styles={customStyles}
                            className="basic-single text-sm"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Cheque..."
                        />
                    </div>
                    <div className='w-full col-span-1'>
                        <label className="block text-sm md:text-base col-span-3 pd-text-body font-semibold mb-2">Paid To </label>
                        <input
                            type="text"
                            style={{ height: "38px", width: "100%" }}
                            {...register("PaidTo", { required: true })}
                            className="pd-input text-sm md:text-base col-span-5"
                        />
                    </div>



                    <div className='flex gap-2 col-span-1'>
                        <label className="text-sm md:text-base pd-text-body font-semibold mb-2">
                            Paid to Vendor
                        </label>
                        <input
                            type="radio"
                            name="PaidFor"
                            value="vendor"
                            disabled={tableData.length !== 0 ? true : false}
                            onChange={(e) => setPaidFor(e.target.value)}
                            checked={PaidFor === "vendor"}
                            
                        />

                        <label className="text-sm md:text-base pd-text-body font-semibold mb-2">
                            Paid to Other
                        </label>
                        <input
                            type="radio"
                            name="PaidFor"
                            value="other"
                            disabled={tableData.length !== 0 ? true : false}
                            onChange={(e) => setPaidFor(e.target.value)}
                            checked={PaidFor === "other"}
                            
                        />
                        <label className="text-sm md:text-base pd-text-body font-semibold mb-2">
                            Paid to Customer
                        </label>
                        <input
                            type="radio"
                            name="PaidFor"
                            value="customer"
                            disabled={tableData.length !== 0 ? true : false}
                            onChange={(e) => setPaidFor(e.target.value)}
                            checked={PaidFor === "customer"}
                            
                        />
                    </div>


                </div>

                <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr className="pd-bg-muted">
                                <th className="border p-2 min-w-[200px]">{PaidFor == "vendor" ? "Vendor" : "Account / Client"}</th>
                                <th className="border p-2" style={{ width: "8vw" }} >Department</th>
                                <th className="border p-2" style={{ width: "8vw" }}>Ref</th>
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
                                            {PaidFor == "vendor" ? <AppSelect
                                                onChange={(selectedOption) =>
                                                    handleCellChange(row.id, 'vendor', selectedOption || '')
                                                }
                                                options={AllVendor}
                                                value={row.show == true ? (row.Account
                                                    ? {
                                                        value: row.Account,
                                                        label: `${Account.find((c) => c._id === row.Account)?.AccountCode} ${Account.find((c) => c._id === row.Account)?.AccountName}`,
                                                    }
                                                    : null) : (row.vendor ? {
                                                        value: `${row.vendor}`,
                                                        label: `${Vendor.find((c) => c._id === row.vendor)?.VendorName}`
                                                    } : null)}
                                                className="basic-single text-sm"
                                                classNamePrefix="pd-select"
                                                isSearchable
                                                placeholder="Select Vendor..."
                                            /> : <AppAsyncSelect
                                                onChange={(option) =>
                                                    handleCellChange(row.id, 'Account', option?.value || '')
                                                }
                                                loadOptions={loadAccounts}
                                                defaultOptions={startingAccount}
                                                value={getAccountOption(row.Client, row.Account, row.Transporter, employeeLineId(row))}
                                                className="basic-single text-sm"
                                                classNamePrefix="pd-select"
                                                isSearchable
                                                isClearable
                                                placeholder="Select Account..."
                                            />
                                            }
                                        </td>
                                        <td>
                                            <AppSelect
                                                onChange={(selectedOption) =>
                                                    handleCellChange(row.id, 'store', selectedOption || '')
                                                }
                                                options={PaidFor === "vendor" ? vendorStore : ALLStore}
                                                value={row.store ? {
                                                    value: `${row.store}`,
                                                    label: `${ALLStore.find((c) => c.value === row.store)?.label}`
                                                } : null}
                                                className="basic-single text-sm"
                                                classNamePrefix="pd-select"
                                                isSearchable
                                                style={{ width: "5vw" }}
                                                placeholder="Select Vendor..."
                                            />
                                        </td>
                                        <td colSpan={1} className="p-2 border-t">
                                            <input
                                                type="text"
                                                value={row.Ref || ''}
                                                onChange={(e) => handleCellChange(row.id, 'Ref', e.target.value)}
                                                placeholder="Enter Ref..."
                                                className="w-full p-2 text-xs md:text-sm border rounded"
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
                                    <td className="border p-2"></td>
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
                        disabled={!MainAccount}
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
                            "Create Bank Payment Voucher"
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default BankPaymentVoucherAdd
