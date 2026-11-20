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
import { useDispatch } from 'react-redux';
import { CircularProgress } from '@mui/material';


const CashVoucherEdit = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const Client = useSelector((state) => state.Client.client)
    const [voucherType, setVoucherType] = useState("")
    const [debitAccount, setDebitAccount] = useState("");
    const [creditAccount, setCreditAccount] = useState("");
    const [invDrp, setInvDrp] = useState([])
    const [ClientInv, setClientInv] = useState([])
    const SoftStore = useSelector((state) => state.Store.Store)
    const { id } = useParams();
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const Vendor = useSelector((state) => state.Vendor.state)
    const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher)
    const ChqBook = useSelector((state) => state.ChqBook.ChqBook)
    const [unUsedChq, setUnuseChq] = useState([])
    const [chq, setChq] = useState('')
    const CashAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer)
    const employeeAccounts = useEmployeeSubAccounts()
    const [loading, setLoading] = useState(true);
    const [disabled, setDisabled] = useState(false);
    const filteredAccount = useMemo(
        () => excludeControlAccounts(
            (Account || []).filter((item) => item.AccountCode?.length > 5),
            CashAccountNumber
        ),
        [Account, CashAccountNumber]
    );
    const store = [{
        _id: "0",
        StoreName: "Head Office",
        StoreCode: "HO"
    }].concat(useSelector((state) => state.Store.Store))

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
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const loadAccounts = useCallback(async (inputValue) => {
        if (!inputValue) return [];

        const filtered = filteredAccount
            .filter((item) =>
                item.AccountName.toLowerCase().includes(inputValue.toLowerCase()) || item.AccountCode.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50);

        return withEmployeeAccountOptions(filtered.map((item) => ({
            label: `${item.AccountCode} ${item.AccountName}`,
            value: item._id
        })), employeeAccounts, inputValue);
    }, [filteredAccount, employeeAccounts]);
    const CashAccount = useMemo(() => Cash.map((item) => ({
        label: `${item.AccountCode} ${item.AccountName}`,
        value: item._id
    })), [Cash]);
    const startingAccount = useMemo(() => filteredAccount.slice(0, 50).map((item) => ({
        label: `${item.AccountCode} ${item.AccountName}`,
        value: item._id
    })), [filteredAccount]);
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
        setTableData((prev) => prev.filter(row => row.id !== id));
    }, []);


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
                        const employeeLine = takeEmployeeVoucherLine(updatedRow, value, CashAccountNumber, employeeAccounts);
                        if (employeeLine.handled) {
                            if (employeeLine.error) {
                                toast.error(employeeLine.error);
                                return prev;
                            }
                            updatedRow = { ...employeeLine.row, Debit: 0, Credit: 0 };
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
                        setInvDrp([])
                        const clientAccount = Client.find((item) => item.AccountCode === value.code)?._id
                        if (clientAccount) {
                            updatedRow.ClientLine = "true"
                            getDataFundtion(`SaleInvoice/invoiceClient/${clientAccount}`).then((ClientInvoice) => {
                                setClientInv(ClientInvoice.data)
                                const DrpCutInv = ClientInvoice.data.map((item) => ({
                                    label: item.SalesInvoice,
                                    value: item.SalesInvoice,
                                }))
                                setInvDrp(DrpCutInv)
                            }).catch(() => {});
                        }
                        if (value.value === debitAccount || value.value === creditAccount) {
                            toast.error("You cannot select the main account as a transaction account");
                            updatedRow.Account = "";
                        } else {
                            updatedRow.Account = value.value;
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
  
          // Handle Ref field (async part)
          if (field === "ClientRef2") {
              updatedRow.ClientRef2 = value.value;
              const RemainInvAmt = ClientInv.find((val) => val.SalesInvoice === value.value)?.RemainingAmount
              updatedRow.Credit = RemainInvAmt
          }
  
          // Update row in the new table data
          newTableData[rowIndex] = updatedRow;
  
          return newTableData;
          });
      }, [Client, Account, CashAccountNumber, ClientInv, getDataFundtion, debitAccount, creditAccount, employeeAccounts]);
  

    const TotalDebit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0), [tableData]);
    const TotalCredit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0), [tableData]);

    const onSubmit = async (data) => {
        if (disabled) return;
        setDisabled(true);

        if (validateClosingMonth(data.VoucherDate, loginVendor)) {
            setDisabled(false);
            return;
        }

        const value2 = TotalDebit - TotalCredit
        //console.log(value2)
        if (value2 == 0) {
            setDisabled(false);
            return toast.error("Credit and Debit Account Not Be Zero")
        }
        const findAccount = tableData.find((ac) => ac.Account == debitAccount)
        if (findAccount) {
            setDisabled(false);
            return toast.error("Main Account not Allow to select in table")
        }
        tableData.push({
            id: Date.now(),
            Account: voucherType === "CR" ? debitAccount : creditAccount,
            Credit: voucherType === "CP" ? Math.abs(TotalDebit - TotalCredit) : 0,
            Debit: voucherType === "CR" ? Math.abs(TotalDebit - TotalCredit) : 0,
            Narration: tableData[0].Narration,
            show: true

        })
        voucherType === "CR" ? data.DebitAccount = debitAccount : data.CreditAccount = creditAccount
        data.VoucharData = tableData,
            TotalDebit = tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
        TotalCredit = tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);
        data.VoucherType = voucherType
        data.TotalDebit = TotalDebit
        data.TotalCredit = TotalCredit
        const value = TotalDebit - TotalCredit

        //console.log(value)
        if (value !== 0) {
            setDisabled(false);
            return toast.error("Credit Account Not Be Zero")
        }
        data.Status = "false"
        try {

            const res = await updateDataFunction(`/Voucher/update/${id}`, data)
            if (chq.label !== unUsedCHqData.label) {
                //console.log("equal")
                await updateDataFunction(`/ChqBook/ChangeStatus/${data.ChequeBook}`, UsedChq)
                await updateDataFunction(`/ChqBook/ChangeStatus/${unUsedCHqData.value}`, unUsedChq)
            }
            const logData = {
                ...data,
                VoucherNumber: data.Voucher ?? currentVoucher?.VoucherNumber,
            };
            await logTransaction({
                data: logData,
                loginVendor,
                type: 'Cash Voucher Edit',
            });
            toast.success("Cash Payment Voucher Updated Successfully")
            //console.log(res)
            setTimeout(() => {
                navigate("/CashVoucher");
            }, 1000);
        } catch (err) {
            //console.log(err)
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
        const unUsedchq = result.filter((item) => item.status == "unUsed")
            .map((ch) => ({
                value: ch.ref,
                label: ch.chq
            }))
        const online = [{
            value: "Online",
            label: "Online"
        }].concat(unUsedchq)
        setUnuseChq(online)
    }

    const getData = () => {
        const voucherData = EditVoucher.find((item) => item._id == id);

        if (voucherData) {
            setMainAccount(voucherData.VoucherMainAccount);
            setTableData(voucherData.VoucharData)
            setVoucherType(voucherData.VoucherType);
            setDebitAccount(voucherData.DebitAccount)
            setCreditAccount(voucherData.CreditAccount)
            setChq({
                label: voucherData.ChequeNumber,
                value: voucherData.ChequeBook
            })
            setUsedCHqData({
                label: voucherData.ChequeNumber,
                value: voucherData.ChequeBook
            })
            SetDrp(voucherData.VoucherMainAccount, 1)
            setCurrentVoucher(voucherData);
            reset({
                VoucherDate: voucherData.VoucherDate.split("T")[0],
                Voucher: voucherData.VoucherNumber,
                Cheque: voucherData.Cheque,
                Remarks: voucherData.Remarks,
            });

        }
    }

    useEffect(() => {
        fetchAllVoucherDependencies(dispatch)
            .then(() => getData())
            .then(() => setLoading(false))
            .catch(() => setLoading(false));
    }, [id, EditVoucher]);
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
    const VoucherType = [{
        value: "CP",
        label: "CP Cash Payment Voucher",
    },
    {
        value: "CR",
        label: "CR Cash Receipt Voucher",
    }
    ]
    return (
        <div className="p-4">
            <GlobalLoader loading={loading} message="Loading Cash Voucher..." />
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">{VoucherType.find((val) => val.value === voucherType)?.label}</h1>

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
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Voucher Type </label>
                        <AppSelect
                            onChange={(selectedOption) => setVoucherType(selectedOption.value)}
                            options={VoucherType}
                            value={voucherType ? VoucherType.find((val) => val.value === voucherType) : null}
                            isDisabled={true}
                            className="basic-single text-sm"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Voucher Type"
                        />
                    </div>
                    {
                        voucherType == "CP" ?
                            <div>
                                <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Credit Account </label>
                                <AppSelect
                                    onChange={(selectedOption) => setCreditAccount(selectedOption.value)}
                                    options={CashAccount}
                                    value={creditAccount ? {
                                        value: `${creditAccount}`,
                                        label: `${Account.find((c) => c._id == creditAccount)?.AccountCode} ${Account.find((c) => c._id === creditAccount)?.AccountName}`
                                    } : null}
                                    className="basic-single text-sm"
                                    classNamePrefix="pd-select"
                                    isSearchable
                                    placeholder="Select credit account..."
                                />
                            </div>
                            : voucherType == "CR" ? <div>
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
                                : null
                    }
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
                                <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Cheque </label>
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
                                <th className="border p-2 min-w-[200px]">Account</th>
                                <th className="border p-2" style={{ width: "8vw" }}>Ref</th>
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
                                                onChange={(selectedOption) =>
                                                    handleCellChange(row.id, 'Account', selectedOption || '')
                                                }
                                                loadOptions={loadAccounts}
                                                defaultOptions={startingAccount}
                                                isClearable={true}
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
                                        </td>

                                        <td colSpan={1} className="p-2 border-t">
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

export default CashVoucherEdit
