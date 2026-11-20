import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
// import { ErrorMessage } from "@hookform/error-message"

import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { updateDate, getInternetDate } from '../../Global/getDate';
import { logTransaction } from '../../Accounts/Vouchers/logTransaction';
import { CircularProgress } from '@mui/material';
import { formatAmount } from '../../../utils/amountToWords';
import AmountInput, { parseAmountInput } from '../../Global/AmountInput.jsx';


const SKIP_INVOICE_REFS = new Set(["", "Advance", "UnRealized", "undefined", "null"]);

const invoiceRemainingOf = (invoice) =>
  Number(invoice?.Remaining ?? invoice?.RemainingAmount ?? invoice?.RemaingAmount ?? 0) || 0;

const findInvoiceByRef = (invoices, ref) => {
  const key = String(ref ?? "").trim();
  if (!key) return null;
  return (invoices || []).find((val) =>
    String(val?.DitributorInvoiceCode ?? "") === key ||
    String(val?.Invoice ?? "") === key ||
    String(val?.SalesInvoice ?? "") === key ||
    String(val?.SalesFlowRef ?? "") === key
  ) || null;
};

const PaymentReciptAdd = () => {
  const navigate = useNavigate();
  const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
  const Distributr = useSelector((state) => state.DistributroReducers.DistributroReducers)
  const RegClient = useSelector((state) => state.Client.client)
  const BankAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer)
  const filteredAccount = Account.filter((item) => item.AccountCode.length > 5)
  const ChqBook = useSelector((state) => state.ChqBook.ChqBook)
  const SoftStore = useSelector((state) => state.Store.Store)
  const Reamin = useSelector((state) => state.DitributorInvoice.ReaminInvoice)
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const City = useSelector((state) => state.City.City)

  const editOpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);

  const filterInvoice = editOpeningInvoices[0]?.InvoiceData?.filter((item) => item.RemaingAmount != 0) || []
  const TotalInvoice = (Reamin || []).concat(filterInvoice)

  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const [selectedStore, setselectedStore] = useState("")
  const [ForDist, setForDist] = useState("No")
  const store = [{
    _id: "0",
    StoreName: "Head Office",
    StoreCode: "HO"
  }].concat(SoftStore)

  const result = [];
  for (let i = BankAccountNumber.BankAccountFrom; i <= BankAccountNumber.BankAccountTo; i++) {
    result.push(i.toString().padStart(5, '0')); // Adjust to 5 digits
  }

  const Client = Distributr.concat(RegClient)

  const AllClientDrp = Account.filter((Acc) => Acc._id == BankAccountNumber.WithholdingTax || Acc._id === BankAccountNumber.UnRealizeAc || Acc._id === BankAccountNumber.UnclaimedAc || Acc._id === BankAccountNumber.shortageAccount || Acc._id === BankAccountNumber.pettyCashAccount).concat(Client)

  const AllClient = AllClientDrp.map((item) => {
    const city = City.find(city => city._id == item.City || "")

    return {
      label: item?.AccountName || ` ${item?.DistrbutorName || item?.CutomerName + " " + (item?.OldCode || item?.SalesFlowRef)}  (${city?.CityName}) `,
      value: item._id
    }
  });

  const defaultClient = AllClient.slice(0, 50)

  const ALLStore = store.map((item) => ({
    label: `${item.StoreName}`,
    value: item._id
  }));

  const Bank = filteredAccount.filter((item) => result.some(prefix => item.AccountCode.startsWith(prefix)))
  const [MainAccount, setMainAccount] = useState("");
  const [tableData, setTableData] = useState([]);
  const [PaidTo, setPaidTo] = useState('')
  console.log(tableData)
  const [type, setType] = useState("Chq")
  const [invDrp, setInvDrp] = useState([])
  const [PaidFor, setPaidFor] = useState("Client");
  const [unUsedChq, setUnuseChq] = useState([])
  const [chq, setChq] = useState('')

  const receipts = useSelector(
    (state) => state.PaymentRecived?.PaymentRecived || []
  );

  const loadAccounts = async (inputValue) => {
    if (!inputValue) return [];

    const filtered = filteredAccount
      .filter((item) =>
        item.AccountName.toLowerCase().includes(inputValue.toLowerCase()) || item.AccountCode.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 50);

    return filtered.map((item) => ({
      label: `${item.AccountCode} ${item.AccountName}`,
      value: item._id
    }));
  }


  const LoadClient = async (inputValue) => {

    const filtered = AllClient
      .filter((item) =>
        item.label.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 50);
    return filtered
  }


  const BankAccount = Bank.map((item) => ({
    label: `${item.AccountCode} ${item.AccountName}`,
    value: item._id
  }));;
  const startingAccount = filteredAccount.slice(0, 50).map((item) => ({
    label: `${item.AccountCode} ${item.AccountName}`,
    value: item._id
  }));;

  const loadTableData = (value) => {
    const filterchq = unUsedChq.filter((item) => item.label !== value.label);
    setUnuseChq(filterchq);

    value.data.forEach((item) => {
      setTableData((prev) => [
        ...prev,
        {
          ...item,
          Narration: `Rcvd Cheque From ${Client.find((c) => c._id == item.Client)?.CutomerName} through Cheque Number ${item.Chq} in ${Account.find((A) => A._id == MainAccount).AccountName}`,
        },
      ]);
    });
  };

  const [show, setShow] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm();


  const addNewRow = () => {
    if (MainAccount == "") {
      return toast.error("Please Select Debit Account")
    }
    setTableData([...tableData, {
      id: Date.now(),
      Account: '',
      store: '',
      Client: '',
      Debit: 0,
      Credit: 0,
      Ref: "",
      ClientRef2: ""
    }]);
  };

  const removeRow = (id) => {
    setTableData(tableData.filter(row => row.id !== id));
  };
  const handleCellChange2 = async (id, field, value) => {
    let newTableData = [...tableData];

    const rowIndex = newTableData.findIndex(row => row.id === id);
    if (rowIndex === -1) return;

    let updatedRow = { ...newTableData[rowIndex] };
    if (field === "Client") {
      updatedRow.Account = "";
      updatedRow.Client = "";
      updatedRow.Debit = 0;
      updatedRow.Credit = 0;
      updatedRow.ClientRef2 = "";
      updatedRow.show = "false"
    }
    /* ---------------- RESET ONLY WHEN ACCOUNT / CLIENT CLEARED ---------------- */
    if (
      (field === "Account" || field === "Client") &&
      (value === "" || value?.value === "")
    ) {
      updatedRow.Account = "";
      updatedRow.Client = "";
      updatedRow.Debit = 0;
      updatedRow.Credit = 0;
      updatedRow.ClientRef2 = "";
      setInvDrp([]);
    }

    /* ---------------- STORE ---------------- */
    if (field === "store") {
      updatedRow.store = value?.value || "";
    }

    /* ---------------- ACCOUNT ---------------- */
    if (field === "Account") {
      updatedRow.Account = value?.value || "";
      updatedRow.Narration = PaidTo;
      updatedRow.Debit = 0;
      updatedRow.Credit = 0;
    }


    /* ---------------- CLIENT ---------------- */
    if (field === "Client") {

      const findClinet = Client.find((item) => item._id === value.value)
      updatedRow.ClientRef2 = ""
      updatedRow.store = selectedStore;
      let withAdvance = [{
        label: "Advance",
        value: "Advance",

      }]
      if (findClinet) {
        updatedRow.Client = value?.value || "";
        //console.log(TotalInvoice)
        const totalinvoice = TotalInvoice
          ?.filter(item => item?.Distrbutor === value?.value || item?.Client === value?.value).concat()
          ?.map((val) => ({
            label: `${val.DitributorInvoiceCode || val.Invoice || val.SalesInvoice} ${val.SalesFlowRef || ""}`,
            value: val.DitributorInvoiceCode || val.Invoice || val.SalesInvoice,
            Store: val.Store || val.store
          }))
        const StoreInvoice = totalinvoice.filter((item) => item.Store == selectedStore)

        updatedRow.store = selectedStore,


          setInvDrp(withAdvance.concat(StoreInvoice));
      }
      else {
        updatedRow.Account = value?.value;
        //console.log(updatedRow.Account)
        updatedRow.Debit = 0;
        updatedRow.show = true
        updatedRow.Credit = 0;
        updatedRow.ClientRef2 = ""
        updatedRow.Narration = PaidTo;
      }

      if (value?.value === MainAccount) {
        toast.error("You cannot select the main account as a transaction account");
        updatedRow.Account = "";
      } else {
        updatedRow.Account = value?.value;
        updatedRow.Debit = 0;
        updatedRow.Credit = 0;
        updatedRow.Narration = PaidTo;
      }
    }

    /* ---------------- DEBIT ---------------- */
    if (field === "Debit") {
      updatedRow.Debit = parseAmountInput(value);
      updatedRow.Credit = 0;
    }

    /* ---------------- CREDIT ---------------- */
    if (field === "Credit") {
      const ref = String(updatedRow.ClientRef2 || "").trim();
      const amount = parseAmountInput(value);
      if (!SKIP_INVOICE_REFS.has(ref)) {
        const invoice = findInvoiceByRef(TotalInvoice, ref);
        if (invoice && amount > invoiceRemainingOf(invoice)) {
          return toast.error(`Payment cannot exceed remaining ${invoiceRemainingOf(invoice)} on invoice ${ref}`);
        }
      }
      updatedRow.Credit = amount;
      updatedRow.Debit = 0;
    }

    /* ---------------- INVOICE REF ---------------- */
    if (field === "ClientRef2") {
      const findRef = tableData.find((item) => item.ClientRef2 === value.value)
      if (findRef) {
        console.log(findRef);
        
        if(findRef.ClientRef2 !== "Advance"){

          return toast.error("Already in the table");
        }
}
      updatedRow.ClientRef2 = value?.value || "";

      const RemainInvAmt = TotalInvoice.find(
        val =>
          val.DitributorInvoiceCode === value?.value || val.Invoice === value?.value || val.SalesInvoice === value?.value
      );

      updatedRow.Narration = `Rcvd from ${Client.find((item) => item._id == updatedRow.Client)?.DistrbutorName || Client.find((item) => item._id == updatedRow.Client)?.Client} Aginst invoice ${value.value}`
      //console.log(RemainInvAmt, "RemainInvAmt")
      if (RemainInvAmt) {
        updatedRow.Type = RemainInvAmt.status ? "Opening" : "Current";
        updatedRow.Credit =
          Number(RemainInvAmt.Remaining || RemainInvAmt.RemaingAmount || RemainInvAmt.RemainingAmount)
        0;
      }

    }

    /* ---------------- NARRATION (SAFE) ---------------- */
    if (field === "Narration") {
      updatedRow.Narration = value;
      // ❌ DO NOT touch Debit or Credit here
    }

    /* ---------------- UPDATE TABLE ---------------- */
    newTableData[rowIndex] = updatedRow;
    setTableData(newTableData);
  };



  const TotalDebit = tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
  const TotalCredit = tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);
  const onSubmit = async (data) => {
    if (isSubmittingRef.current || loading) return;
    isSubmittingRef.current = true;
    setLoading(true);

    let success = false;
    try {
      const formattedDate = await getInternetDate();

      data.ReciptDate = formattedDate
      data.ReciptMainAccount = MainAccount
      data.ReciptData = tableData
      data.forDis = ForDist
      const AllRef = tableData.map((item) => item.ClientRef2);

      const clientCreditWithoutRef = tableData.find((row) => {
        const ref = String(row?.ClientRef2 || row?.Ref || "").trim();
        return row.Client && Number(row.Credit) > 0 && !ref;
      });
      if (clientCreditWithoutRef) {
        toast.error("Client row on Credit side must have an Invoice Reference (Ref)");
        return;
      }

      if (TotalCredit < TotalDebit) {
        toast.error("Debit cannot be greater than credit")
        return
      }

      const remainingByRef = {};
      for (const row of tableData) {
        const chqRefs = Array.isArray(row?.ChqRef) ? row.ChqRef : (row?.ChqRef ? [row.ChqRef] : []);
        const lineRefs = chqRefs.length
          ? chqRefs.map((cr) => ({ ref: String(cr?.ref || "").trim(), amount: Number(cr?.Am) || 0 }))
          : [{ ref: String(row?.ClientRef2 || row?.Ref || "").trim(), amount: Number(row?.Credit) || 0 }];

        for (const line of lineRefs) {
          if (SKIP_INVOICE_REFS.has(line.ref) || line.amount <= 0) continue;
          remainingByRef[line.ref] = (remainingByRef[line.ref] || 0) + line.amount;
        }
      }
      for (const [ref, amount] of Object.entries(remainingByRef)) {
        const invoice = findInvoiceByRef(TotalInvoice, ref);
        if (!invoice) continue;
        const remaining = invoiceRemainingOf(invoice);
        if (amount > remaining) {
          toast.error(`Payment ${amount} exceeds remaining ${remaining} on invoice ${ref}`)
          return
        }
      }

      const allReciopt = receipts
        .filter((item) => item.status !== "Reject")
        .flatMap((item) => item.ReciptData || [])
        .filter((receiptItem) => AllRef.includes(Number(receiptItem.ClientRef2)));

      const duplicatePending = allReciopt.filter((item) => item.ClientRef2 !== "Advance");
      if (duplicatePending.length !== 0) {
        const errors = duplicatePending.map((item) => item.ClientRef2)
        toast.error(`These ${errors.join(",")} are already in pending payments`)
        return
      }

      const res = await createDataFunction("/PaymentRecived", data)
      if (!res) {
        toast.error("Something went wrong")
        return
      }

      success = true
      await logTransaction({
        data: {
          ...data,
          VoucherNumber: res.Voucher || res.ReciptNumber,
        },
        loginVendor,
        type: 'Bank Receipt Voucher Edit',
      });
      toast.success(res.Voucher ? `Payment received. Voucher ${res.Voucher}` : "Data added")
      setTimeout(() => {
        navigate("/PaymentReciptList")
      }, 1500)
    } catch (err) {
      toast.error(err?.response?.data?.message || "Something went wrong")
    } finally {
      if (!success) {
        isSubmittingRef.current = false;
        setLoading(false);
      }
    }
  }
  const SetDrp = (val) => {
    setMainAccount(val)
    setUnuseChq([])
    setChq('')
    //console.log(ChequeBook)
    const AllChq = ChqBook.map(item => ({
      label: item.chq,
      value: item.id,
      Credit: item.Amount,
      Ref: item.Invoice,
      Client: item.Customer,
      status: item.staus || item.status,
      Chq: item.chq,
      Account: BankAccountNumber.Client,
      id: Date.now() + Math.random(),
      Type: item.Type
    }));

    // Step 2: Merge by Chq
    const mergedChqByClient = Object.values(
      AllChq.reduce((acc, curr) => {
        if (acc[curr.Client]) {
          // If chq exists, sum the Credit
          acc[curr.Client].Credit += curr.Credit;

          // Merge Ref
          acc[curr.Client].Ref += `, ${curr.Ref}`;

        } else {
          // Copy first occurrence
          acc[curr.Chq] = { ...curr, ChqRef: [{ Am: Number(curr.Credit), ref: curr.Ref, value: curr.value }] };
        }
        return acc;
      }, {})
    );
    const mergedChq = Object.values(
      AllChq.reduce((acc, curr) => {
        if (acc[curr.Chq]) {
          // If chq exists, sum the Credit
          acc[curr.Chq].Credit += Number(curr.Credit);

          // Merge Ref
          acc[curr.Chq].Ref += `, ${curr.Ref}`;

          // Push detailed entry
          acc[curr.Chq].ChqRef.push({ Am: Number(curr.Credit), ref: curr.Ref, value: curr.value });
        } else {
          // Copy first occurrence
          acc[curr.Chq] = { ...curr, ChqRef: [{ Am: Number(curr.Credit), ref: curr.Ref, value: curr.value }] };
        }
        return acc;
      }, {})
    );


    const filterChq = mergedChq.filter((item) => item.status == "Pending")
    const grouped = Object.values(
      filterChq.reduce((acc, item) => {
        const key = item.label + "_" + item.value;
        if (!acc[key]) {
          acc[key] = {
            label: item.label,
            value: item.value,
            data: [item]

          };
        } else {
          acc[key].data.push(item);
        }
        return acc;
      }, {})
    );

    setUnuseChq(grouped);
    const arr = []
    const combined = AllChq.flatMap((item, index) => {
      const id = item._id || item.id;
      Object.entries(item)
      arr.push({
        ref: item.id,
        chq: item.chqs

      })

    });

  }
  useEffect(() => {
    loginVendor.isDistributor == "true" ? setselectedStore(loginVendor.Store[0]) : null
    loginVendor.isDistributor == "true" ? setForDist("Yes") : setForDist("No")
    getInternetDate().then((internetDate) => {
      reset({
        ReciptDate: internetDate
      })
    });
  }, []);

  useEffect(() => {
    if (!selectedStore) return;
    // When selectedStore changes, recalculate invoice dropdowns for all rows with a Client
    let withAdvance = [{ label: "Advance", value: "Advance" }];
    tableData.forEach((row) => {
      if (row.Client && !row.show) {
        const totalinvoice = TotalInvoice
          ?.filter(item => item?.Distrbutor === row.Client || item?.Client === row.Client)
          ?.map((val) => ({
            label: `${val.DitributorInvoiceCode || val.Invoice || val.SalesInvoice} ${val.SalesFlowRef || ""}`,
            value: val.DitributorInvoiceCode || val.Invoice || val.SalesInvoice,
            Store: val.Store || val.store
          }));
        const StoreInvoice = totalinvoice.filter((item) => item.Store == selectedStore);
        // Update the last invDrp for the most recently selected row
        setInvDrp(withAdvance.concat(StoreInvoice));
      }
    });
  }, [selectedStore]);

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
      <ToastContainer />
      <h1 className="pd-page-title text-center mb-6">Bank Receipt Voucher</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-bg-surface p-4 md:p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="pd-label">Voucher Date </label>
            <input
              type="date"
              disabled={true}
              style={{ height: "38px" }}
              {...register("ReciptDate", { required: true })}
              className="pd-input"
            />
          </div>
          <div>
            <label className="pd-label">Store </label>
            <AppSelect
              isDisabled={loginVendor.isDistributor == "true" ? true : false || tableData.length > 0 ? true : false}
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
            <label className="pd-label">Debit Account </label>
            <AppSelect
              isDisabled={tableData.length > 0 ? true : false}
              onChange={(selectedOption) => SetDrp(selectedOption.value)}
              options={BankAccount}
              value={MainAccount ? {
                value: `${MainAccount}`,
                label: `${Account.find((c) => c._id === MainAccount)?.AccountCode} ${Account.find((c) => c._id === MainAccount)?.AccountName}`
              } : null}
              className="basic-single text-sm"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select Debit account..."
            />
          </div>


          <div>
            <label className="pd-label">Voucher Number </label>
            <input
              type="text"
              disabled={true}
              style={{ height: "38px" }}
              {...register("Voucher")}
              className="pd-input"
            />
          </div>

          <div className='w-full col-span-1'>
            <label className="block text-sm md:text-base col-span-3 pd-text-body font-semibold mb-2">Received From </label>
            <input
              type="text"
              style={{ height: "38px", width: "100%" }}
              {...register("PaidTo", { required: 'This field is required' })}
              onChange={(e) => setPaidTo(e.target.value)}
              className="pd-input col-span-5"
            />

          </div>





        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr>
                <th className="border p-2 min-w-50">{PaidFor == "other" ? "Account" : "Client"}</th>
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
                  <tr key={row.id} >
                    <td className="border p-2">
                      <AppAsyncSelect
                        onChange={(selectedOption) =>
                          handleCellChange2(row.id, 'Client', selectedOption || '')
                        }
                        loadOptions={LoadClient}
                        value={row.show == true ? (row.Account
                          ? {
                            value: row.Account,
                            label: `${Account.find((c) => c._id === row.Account)?.AccountCode} ${Account.find((c) => c._id === row.Account)?.AccountName}`,
                          }
                          : null) : (row.Client ? {
                            value: `${row.Client}`,
                            label: `${AllClient.find((c) => c.value === row.Client)?.label}`
                          } : null)}
                        className="basic-single text-sm"
                        classNamePrefix="pd-select"
                        isSearchable
                        defaultOptions={defaultClient}
                        placeholder="Select Client..."
                      />
                    </td>

                    {PaidFor == "Client" ? <td colSpan={1} className="p-2 border-t">
                      <AppSelect options={invDrp}
                        onChange={(selectedOption) =>
                          handleCellChange2(row.id, 'ClientRef2', selectedOption || '')
                        }
                        value={({
                          value: row.ClientRef2,
                          label: row.ClientRef2
                        })}
                      />
                    </td>
                      : null}

                    <td className="border p-2">
                      <AmountInput
                        style={{ width: "5vw" }}
                        value={row.Debit}
                        onChange={(raw) => handleCellChange2(row.id, 'Debit', raw)}
                        className="w-full p-1 text-xs md:text-sm border rounded"
                      />
                    </td>


                    <td className="border p-2">
                      <AmountInput
                        style={{ width: "5vw" }}
                        value={row.Credit}
                        onChange={(raw) => handleCellChange2(row.id, 'Credit', raw)}
                        className="w-full p-1 text-xs md:text-sm border rounded"
                      />
                    </td>
                    <td colSpan={1} className="p-2 border-t">
                      <input
                        type="text"
                        value={row.Narration || ''}
                        onChange={(e) => handleCellChange2(row.id, 'Narration', e.target.value)}
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
                  {loginVendor.isDistributor !== "true" ? <td className="border p-2 text-right">{formatAmount(TotalDebit)}</td> : null}
                  <td className="border p-2 hidden md:table-cell text-right">{formatAmount(TotalCredit)}</td>
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
            disabled={loading}
            className="pd-btn-save text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <CircularProgress size={18} color="inherit" />
                <span>Creating...</span>
              </>
            ) : (
              "Create Bank Receipt"
            )}
          </button>
        </div>
      </form >
    </div >
  )
}

export default PaymentReciptAdd