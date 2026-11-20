import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
import GlobalLoader from '../../../Global/GlobalLoader.jsx';
import { fetchAllVoucherDependencies } from '../fetchVoucherDependencies.js';
import { clearEmployeeSubAccount, employeeAccountOption, employeeLineId, takeEmployeeVoucherLine, useEmployeeSubAccounts, withEmployeeAccountOptions } from '../employeeSubAccounts.js';
import { excludeControlAccounts, isDirectClientControl, isDirectTransporterPayable } from '../voucherControlAccounts.js';
import { CircularProgress } from '@mui/material';


const CashVoucherAdd = () => {
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
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const filteredAccount = useMemo(
        () => excludeControlAccounts(
            (Account || []).filter((item) => item.AccountCode?.length > 5),
            CashAccountNumber
        ),
        [Account, CashAccountNumber]
    )
    const Client = useSelector((state) => state.Client.client)
    const [voucherType, setVoucherType] = useState("")
    const [debitAccount, setDebitAccount] = useState("");
    const [creditAccount, setCreditAccount] = useState("");
    const [tableData, setTableData] = useState([]);
    const [disabled, setDisabled] = useState(false);
    const [invDrp, setInvDrp] = useState([])
    const [ClientInv, setClientInv] = useState([])
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

    const handleCellChange = useCallback(async (id, field, value) => {
        setTableData((prev) => {
            let newTableData = [...prev];

            const rowIndex = newTableData.findIndex(row => row.id === id);
            if (rowIndex === -1) return prev;

            let updatedRow = { ...newTableData[rowIndex], [field]: value };



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
                          // Prevent direct entry into Client account
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
                              try {
                                  getDataFundtion(`SaleInvoice/invoiceClient/${clientAccount}`).then((ClientInvoice) => {
                                      setClientInv(ClientInvoice.data)
                                      const DrpCutInv = ClientInvoice.data.map((item) => ({
                                          label: item.SalesInvoice,
                                          value: item.SalesInvoice,
                                      }))
                                      DrpCutInv.push({
                                          label: "Advance",
                                          value: "Advance",
                                      })
                                      setInvDrp(DrpCutInv)
                                  }).catch(() => {});

                              } catch (err) {
      
                          }
      
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
                if (value.value !== "Advance") {
                    const RemainInvAmt = ClientInv.find((val) => val.SalesInvoice === value.value)?.RemainingAmount
                    updatedRow.Credit = RemainInvAmt
                } else {
                    updatedRow.Credit = 0
                }
            }

            // Update row in the new table data
            newTableData[rowIndex] = updatedRow;

            // Finally, update state
            return newTableData;
        });
    }, [Client, ClientInv, debitAccount, creditAccount, CashAccountNumber, employeeAccounts]);




    const TotalDebit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0), [tableData]);
    const TotalCredit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0), [tableData]);
    const onSubmit = async (data) => {
        if (disabled) return;
        setDisabled(true);

        if (validateClosingMonth(data.VoucherDate, loginVendor)) {
            setDisabled(false);
            return;
        }

        const filterTable = tableData.filter((a) => voucherType === "CR" ? a.Account != debitAccount : a.Account != creditAccount)
        let FilterTotalDebit = filterTable.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
        let FilterTotalCredit = filterTable.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);

        filterTable.push({
            id: Date.now(),
            Account: voucherType === "CR" ? debitAccount : creditAccount,
            Credit: voucherType === "CP" ? Math.abs(FilterTotalDebit - FilterTotalCredit) : 0,
            Debit: voucherType === "CR" ? Math.abs(FilterTotalDebit - FilterTotalCredit) : 0,
            Narration: tableData[0].Narration,
            show: true

        })
        setTableData(filterTable)
        data.VoucharData = filterTable,
            voucherType === "CR" ? data.DebitAccount = debitAccount : data.CreditAccount = creditAccount
        data.status = "Post"
        try {
            const code = await getDataFundtion(`/Voucher/GetLastVouher/${voucherType}?Voucherdate=${data.VoucherDate}`)
            if (code.length == 0) {
                data.VoucherNumber = `${voucherType}0000001`
            } else {
                let nextVoucherNumber = (parseInt(code[0].VoucherNumber.slice('2', "9"))) + 1
                data.VoucherNumber = `${voucherType}${nextVoucherNumber.toString().padStart(7, '0')}`;
            }

            let TotalDebit = filterTable.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
            let TotalCredit = filterTable.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);
            data.VoucherType = voucherType
            data.TotalDebit = TotalDebit
            data.TotalCredit = TotalCredit
            const value = TotalDebit - TotalCredit
            if (value !== 0) {
                setDisabled(false);
                return toast.error("Credit Account Not Be Zero")
            }
            const invoiceData = tableData.filter((item) => item.ClientLine == "true")
                .map((inv) => ({
                    amount: inv.Credit,
                    inv: inv.ClientRef2
                }))
            data.invoiceData = invoiceData
            const res = await createDataFunction("/Voucher", data)
            await logTransaction({
                data,
                loginVendor,
                type: 'Cash Voucher',
            });
            setTimeout(() => {
                navigate("/CashVoucher");
            }, 1000);
        } catch (err) {
            setDisabled(false);
            if (err.status === 401) {
                toast.error(err.response.data.message)

            } else {
                toast.error("Something went wrong")
            }
        }
    }


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


    const VoucherType = useMemo(() => [{
        value: "CP",
        label: "CP Cash Payment Voucher",
    },
    {
        value: "CR",
        label: "CR Cash Receipt Voucher",
    }
    ], [])
    return (
        <div className="p-4">
            <GlobalLoader loading={loading} message="Loading Cash Voucher..." />
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
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Voucher Type </label>
                        <AppSelect
                            onChange={(selectedOption) => setVoucherType(selectedOption.value)}
                            options={VoucherType}
                            value={voucherType ? VoucherType.find((val) => val.value === voucherType) : null}
                            isDisabled={tableData.length === 0 ? false : true}
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
                                        label: `${Account.find((c) => c._id === creditAccount)?.AccountCode} ${Account.find((c) => c._id === creditAccount)?.AccountName}`
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
                                <th className="border p-2 min-w-[200px]">Account</th>
                                {voucherType == "CR" ? <th className="border p-2" style={{ width: "8vw" }}>Ref</th> : null}
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

                                        {voucherType == "CR" ? <td colSpan={1} className="p-2 border-t">
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
                            "Create Cash Voucher"
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default CashVoucherAdd
