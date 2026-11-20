import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppAsyncSelect from '../../../Global/AppAsyncSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../../Api/CRUDFunctions';
import { rangeBetween } from '../../../Global/GenrateCode';
import AppSelect from '../../../Global/AppSelect.jsx'
import AmountInput from '../../../Global/AmountInput.jsx'
import { logTransaction } from '../logTransaction';
import { formatAmount, amountToWords } from '../../../../utils/amountToWords.js';
import { validateClosingMonth } from '../../../Global/validateClosingMonth';
import GlobalLoader from '../../../Global/GlobalLoader.jsx';
import { fetchAllVoucherDependencies } from '../fetchVoucherDependencies.js';
import { clearEmployeeSubAccount, employeeAccountOption, employeeLineId, takeEmployeeVoucherLine, useEmployeeSubAccounts, withEmployeeAccountOptions } from '../employeeSubAccounts.js';
import { excludeControlAccounts, isDirectClientControl, isDirectTransporterPayable } from '../voucherControlAccounts.js';
import { assertEditableVoucher, parseVoucherByIdResponse } from '../voucherEditAccess.js';
import { fetchVoucher } from '../../../../Redux/Reducers/VoucherReducer';
import { useDispatch } from 'react-redux';
import { CircularProgress } from '@mui/material';


const CashPaymentVoucherEdit = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { id } = useParams();
    const [vendorStore, setVendorStore] = useState([])
    const [UsedCHqData, setUsedCHqData] = useState([])
    const [loading, setLoading] = useState(true);
    const [disabled, setDisabled] = useState(false);
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const Vendor = useSelector((state) => state.Vendor.state)
    const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher)
    const ChqBook = useSelector((state) => state.ChqBook.ChqBook)
    const [unUsedChq, setUnuseChq] = useState([])
    const [chq, setChq] = useState('')
    const CashAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer)
    const employeeAccounts = useEmployeeSubAccounts()
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const Transport = useSelector((state) => state.Transport.Transport)
    const City = useSelector((state) => state.City.City)
    const Client1 = useSelector((state) => state.Client.client)
    const Client = (Client1 || []).map((item) => ({
        ...item,
        DistrbutorName: item.DistrbutorName + ` (${City.find((c) => c._id === item.City)?.CityName || ''})`
    }));

    const filteredAccount = useMemo(
        () => excludeControlAccounts(
            (Account || []).filter((item) => item.AccountCode?.length > 5),
            CashAccountNumber
        ),
        [Account, CashAccountNumber]
    );
    const SoftStore = useSelector((state) => state.Store.Store)
    const store = [{
        _id: "0",
        StoreName: "Head Office",
        StoreCode: "HO"
    }].concat(SoftStore)

    const result = useMemo(() => {
        const res = [];
        for (let i = CashAccountNumber.CashAccountFrom; i <= CashAccountNumber.CashAccountTo; i++) {
            res.push(i.toString().padStart(5, '0'));
        }
        return res;
    }, [CashAccountNumber.CashAccountFrom, CashAccountNumber.CashAccountTo]);
    const AllVendorDrp = useMemo(() => Account.filter((Acc) => Acc._id == CashAccountNumber.WithholdingTax).concat(Vendor), [Account, CashAccountNumber, Vendor]);
    const AllVendor = useMemo(() => AllVendorDrp.map((item) => ({
        label: `${item.VendorName || item.AccountName} `,
        value: item._id
    })), [AllVendorDrp]);

    const ALLStore = useMemo(() => store.map((item) => ({
        label: `${item.StoreName}`,
        value: item._id
    })), [store]);
    const Cash = useMemo(() => filteredAccount.filter((item) => result.some(prefix => item.AccountCode.startsWith(prefix))), [filteredAccount, result]);
    const [MainAccount, setMainAccount] = useState("");
    const [tableData, setTableData] = useState([]);
    const [PaidFor, setPaidFor] = useState("vendor");
    const [currentVoucher, setCurrentVoucher] = useState(null);
    //console.log(PaidFor)
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
    const CashAccount = useMemo(() => Cash.map((item) => ({
        label: `${item.AccountCode} ${item.AccountName}`,
        value: item._id
    })), [Cash]);
    const startingAccount = useMemo(() => filteredAccount.slice(0, 50).map((item) => ({
        label: `${item.AccountCode} ${item.AccountName}`,
        value: item._id,
        code: item.AccountCode
    })), [filteredAccount]);

    const getAccountOption = useCallback((clientId, accountId, transporterId, subAccountId) => {
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
    }, [Client, Transport, Account, employeeAccounts]);
    const [show, setShow] = useState(false)
    const { reset, register, handleSubmit, formState: { errors } } = useForm();

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
        setTableData((prev) => prev.filter(row => row.id !== id && row._id !== id));
    }, []);


    const handleCellChange = useCallback((id, field, value) => {
        setTableData((prev) => prev.map(row => {
            if (row.id === id || row._id === id) {

                let updatedRow = { ...row, [field]: value };
                const checking = prev.find((item) => item.id == id)
                if (field == "vendor") {
                    const checkWth = Account.find((item) => item._id == value.value)
                    if (checkWth) {
                        updatedRow.Account = checkWth._id
                        updatedRow.vendor = ""
                        updatedRow.show = true
                    }
                    else {
                        updatedRow.Account = CashAccountNumber.Vendor
                        updatedRow.vendor = value.value
                        updatedRow.show = false

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


                    if (checking.Account != value) {

                    }
                }

                if (updatedRow.Account == "") {

                }
                if (field == "store") {
                    updatedRow.store = value.value
                }

                if (field == "Account") {
                    const employeeLine = takeEmployeeVoucherLine(updatedRow, value, CashAccountNumber, employeeAccounts);
                    if (employeeLine.handled) {
                        if (employeeLine.error) {
                            toast.error(employeeLine.error);
                            return row;
                        }
                        updatedRow = { ...employeeLine.row, Debit: 0, Credit: 0 };
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
                            updatedRow.Account = CashAccountNumber?.Client;
                            updatedRow.Client = clientAccount;
                            updatedRow.ClientLine = "true";
                        } else if (transportAccount) {
                            updatedRow.Account = CashAccountNumber?.TransporterPayable;
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
    }, [Account, CashAccountNumber, Vendor, SoftStore, Client, Transport, MainAccount, employeeAccounts]);


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

        if (tableData.length != 0) {


            const value = TotalDebit - TotalCredit
            if (value <= 0) {
                setDisabled(false);
                return toast.error("Credit Account Not Be Zero")
            }
        
        tableData.push({
            Account: MainAccount,
            Credit: value,
            id: Date.now() + Math.random(),
            Narration: tableData[0]?.Narration,
            show: true

        })
        }
        data.ChequeNumber = chq.label,
            data.ChequeBook = chq.value
        data.PaidFor = PaidFor
        data.VoucharData = tableData,
            data.VoucherMainAccount = MainAccount
        data.Status = "false"
        data.TotalDebit = TotalDebit
        data.TotalCredit = TotalCredit
        //console.log(data)
        const UsedCheque = {
            chqNumber: [chq.label],
            Status: "used",
        }

        setShow(true)
        try {
            const res = await updateDataFunction(`/Voucher/update/${id}`, data)

            console.log(res)
            setTimeout(() => {
                navigate("/CashPaymentVoucher");
            }, 1000);
        } catch (err) {
            console.log(err)
            toast.error("Something went wrong")
            setDisabled(false);
        }
    }

    const SetDrp = (val, ps) => {
        setMainAccount(val)
        setUnuseChq([])
        ps === undefined ? setChq('') : null
        const AllChq = ChqBook.filter((item) => item.Cash == val)
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
            obj.chq.forEach(innerObj => {
                result.push({
                    ref: obj.ref,
                    chq: innerObj.chq,
                    status: innerObj.status
                });
            });
        });



    }

    const getData = async () => {
        if (!id) return;
        let voucherData = (EditVoucher || []).find((item) => String(item._id) === String(id));

        try {
            const res = await getDataFundtion(`/Voucher/VoucherByID/${id}`);
            const apiVoucher = parseVoucherByIdResponse(res);
            if (apiVoucher) voucherData = apiVoucher;
        } catch (err) {
            console.error("VoucherByID failed", err);
            if (!voucherData) {
                toast.error("Failed to load voucher data");
                return;
            }
        }

        if (!voucherData) {
            toast.error("Voucher not found");
            return;
        }

        if (!assertEditableVoucher({
            voucher: voucherData,
            expectedType: "CP",
            userRights: UserRihts,
            navigate,
            toast,
        })) {
            return;
        }

        setMainAccount(voucherData.VoucherMainAccount);
        setTableData((voucherData.VoucharData || []).filter((row) => !row.show));
        setPaidFor(voucherData.PaidFor);
        setChq({
            label: voucherData.ChequeNumber,
            value: voucherData.ChequeBook
        });
        setUsedCHqData({
            label: voucherData.ChequeNumber,
            value: voucherData.ChequeBook
        });
        SetDrp(voucherData.VoucherMainAccount, 1);
        setCurrentVoucher(voucherData);
        reset({
            VoucherDate: voucherData.VoucherDate
                ? voucherData.VoucherDate.split("T")[0]
                : "",
            Voucher: voucherData.VoucherNumber,
            ChequeNumber: voucherData.ChequeNumber,
            PaidTo: voucherData.PaidTo,
            Ref: voucherData.Ref
        });
    }

    useEffect(() => {
        let cancelled = false;
        const loadAll = async () => {
            setLoading(true);
            try {
                await fetchAllVoucherDependencies(dispatch);
            } catch (err) {
                console.error(err);
            }

            try {
                try {
                    const data = await getDataFundtion("/Voucher?&VoucherType=CP");
                    if (!cancelled) dispatch(fetchVoucher(data.data || []));
                } catch (listErr) {
                    console.error(listErr);
                }
                if (!cancelled) await getData();
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadAll();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, dispatch]);
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
            backgroundColor: state.isSelected,
            color: '#000',
        }),
    };
    return (
        <div className="p-4">
            <GlobalLoader loading={loading} message="Loading Cash Payment Voucher..." />
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Cash Paymnet Voucher</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Voucher Date </label>
                        <input
                            type="date"
                            style={{ height: "38px" }}
                            disabled={loginVendor.BranchUser == "true" ? true : false}
                            {...register("VoucherDate", { required: true })}
                            className="pd-input text-sm md:text-base"
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Credit Account </label>
                        <AppSelect
                            onChange={(selectedOption) => SetDrp(selectedOption.value)}
                            options={CashAccount}
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
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Ref </label>
                        <input
                            type="text"
                            style={{ height: "38px" }}
                            {...register("Ref")}
                            className="pd-input text-sm md:text-base"
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
                    </div>


                </div>

                <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr className="pd-bg-muted">
                                <th className="border p-2 min-w-[200px]">{PaidFor == "other" ? "Account / Client" : "Vendor"}</th>
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
                                    <tr key={row.id || row._id} className="hover:pd-bg-muted">
                                        <td className="border p-2">
                                            {PaidFor == "vendor" ? <AppSelect
                                                onChange={(selectedOption) =>
                                                    handleCellChange(row.id || row._id, 'vendor', selectedOption || '')
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
                                                    handleCellChange(row.id || row._id, 'Account', option?.value || '')
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
                                                    handleCellChange(row.id || row._id, 'store', selectedOption || '')
                                                }
                                                options={vendorStore?.length ? vendorStore : ALLStore}
                                                value={row?.store ? {
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
                                                onChange={(e) => handleCellChange(row.id || row._id, 'Ref', e.target.value)}
                                                placeholder="Enter Ref..."
                                                className="w-full p-2 text-xs md:text-sm border rounded"
                                            />
                                        </td>
                                        <td className="border p-2">
                                            <AmountInput
                                                style={{ width: "5vw" }}
                                                value={row.Debit}
                                                onChange={(raw) => handleCellChange(row.id || row._id, 'Debit', raw)}
                                                className="w-full p-1 text-xs md:text-sm border rounded"
                                            />
                                        </td>

                                        <td className="border p-2">
                                            <AmountInput
                                                style={{ width: "5vw" }}
                                                value={row.Credit}
                                                onChange={(raw) => handleCellChange(row.id || row._id, 'Credit', raw)}
                                                className="w-full p-1 text-xs md:text-sm border rounded"
                                            />
                                        </td>
                                        <td colSpan={1} className="p-2 border-t">
                                            <input
                                                type="text"
                                                value={row.Narration || ''}
                                                onChange={(e) => handleCellChange(row.id || row._id, 'Narration', e.target.value)}
                                                placeholder="Enter narration..."
                                                className="w-full p-2 text-xs md:text-sm border rounded"
                                            />
                                        </td>

                                        <td className="border p-2">
                                            <button
                                                type="button"
                                                onClick={() => removeRow(row.id || row._id)}
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
                                <span>Updating...</span>
                            </>
                        ) : (
                            "Edit Cash Payment Voucher"
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default CashPaymentVoucherEdit
