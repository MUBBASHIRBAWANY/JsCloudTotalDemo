import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppSelect from '../../Global/AppSelect.jsx'
import AmountInput, { parseAmountInput } from '../../Global/AmountInput.jsx'
import { updateDataFunction } from '../../../Api/CRUDFunctions';
import {amountToWords, formatAmount} from '../../../utils/amountToWords';
import { CircularProgress } from '@mui/material';


const PaymentReciptEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
  const Distributr = useSelector((state) => state.DistributroReducers.DistributroReducers);
  const RegClient = useSelector((state) => state.Client.client)
  const BankAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer);
  const filteredAccount = Account.filter((item) => item.AccountCode.length > 5);
  const ChqBook = useSelector((state) => state.ChqBook.ChqBook);
  const SoftStore = useSelector((state) => state.Store.Store);
  const Reamin = useSelector((state) => state.DitributorInvoice.ReaminInvoice);

  const City = useSelector((state) => state.City.City)

  const editOpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);
  const filterInvoice = editOpeningInvoices[0]?.InvoiceData.filter((item) => item.RemaingAmount != 0)
  const TotalInvoice = Reamin.concat(filterInvoice || []);

  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
  const [selectedStore, setSelectedStore] = useState("");
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [existingData, setExistingData] = useState(null);





  const store = [{
    _id: "0",
    StoreName: "Head Office",
    StoreCode: "HO"
  }].concat(SoftStore);

  const result = [];
  for (let i = BankAccountNumber.BankAccountFrom; i <= BankAccountNumber.BankAccountTo; i++) {
    result.push(i.toString().padStart(5, '0'));
  }
  const Client = Distributr.concat(RegClient)
  const AllClientDrp = Account.filter((Acc) => Acc._id == BankAccountNumber.WithholdingTax || Acc._id === BankAccountNumber.UnRealizeAc || Acc._id === BankAccountNumber.UnclaimedAc || Acc._id === BankAccountNumber.pettyCashAccount).concat(Client)

  const AllClient = AllClientDrp.map((item) => {
    const city = City.find(city => city._id == item.City || "")

    return {
      label: item?.AccountName || ` ${item?.DistrbutorName || item?.CutomerName + " " + (item?.OldCode || item?.SalesFlowRef)}  (${city?.CityName}) `,
      value: item._id
    }
  });


  const defaultClient = AllClient.slice(0, 50);

  const ALLStore = store.map((item) => ({
    label: `${item.StoreName}`,
    value: item._id
  }));

  const Bank = filteredAccount.filter((item) => result.some(prefix => item.AccountCode.startsWith(prefix)));
  const [MainAccount, setMainAccount] = useState("");
  const [tableData, setTableData] = useState([]);
  const [PaidTo, setPaidTo] = useState('');

  const [invDrp, setInvDrp] = useState([]);
  const [unUsedChq, setUnuseChq] = useState([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const receipts = useSelector(
    (state) => state.PaymentRecived?.PaymentRecived || []
  );


  // Fetch existing data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = receipts.find((r) => r._id === id);

        if (response) {
          setExistingData(response);
          setMainAccount(response.ReciptMainAccount);
          setPaidTo(response.PaidTo || '');
          setSelectedStore(response.ReciptData[0].store);

          // Set table data
          if (response.ReciptData && Array.isArray(response.ReciptData)) {
            const formattedTableData = response.ReciptData.map((item, index) => ({
              ...item,
              id: item.id || Date.now() + index,
              Debit: item.Debit || 0,
              Credit: item.Credit || 0,
              show: item.Account ? true : false
            }));
            setTableData(formattedTableData);
          }

          // Reset form
          reset({
            ReciptDate: response.ReciptDate ? new Date(response.ReciptDate).toISOString().split('T')[0] : '',
            Voucher: response.Voucher || '',
            PaidTo: response.PaidTo || '',
            Remarks: response.Remarks || ''
          });

          // Setup cheque dropdown if applicable
          if (response.ReciptMainAccount) {
            setupChequeDropdown(response.ReciptMainAccount);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Failed to load payment receipt data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, reset]);

  const setupChequeDropdown = (accountId) => {
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

    const mergedChq = Object.values(
      AllChq.reduce((acc, curr) => {
        if (acc[curr.Chq]) {
          acc[curr.Chq].Credit += Number(curr.Credit);
          acc[curr.Chq].Ref += `, ${curr.Ref}`;
          acc[curr.Chq].ChqRef.push({ Am: Number(curr.Credit), ref: curr.Ref, value: curr.value });
        } else {
          acc[curr.Chq] = { ...curr, ChqRef: [{ Am: Number(curr.Credit), ref: curr.Ref, value: curr.value }] };
        }
        return acc;
      }, {})
    );

    const filterChq = mergedChq.filter((item) => item.status == "Pending");
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
  };

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
  };

  const LoadClient = async (inputValue) => {
    const filtered = AllClient
      .filter((item) =>
        item.label.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 50);
    return filtered;
  };

  const BankAccount = Bank.map((item) => ({
    label: `${item.AccountCode} ${item.AccountName}`,
    value: item._id
  }));

  const handleCellChange2 = async (id, field, value) => {
    let newTableData = [...tableData];

    const rowIndex = newTableData.findIndex(row => row.id === id);
    if (rowIndex === -1) return;

    let updatedRow = { ...newTableData[rowIndex] };

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
      const invoice = TotalInvoice.find((val) => val.Invoice == updatedRow.ClientRef2 || val.DitributorInvoiceCode === updatedRow.ClientRef2)
      const amount = parseAmountInput(value);
      //console.log(invoice)
      if (amount > Number(invoice?.Remaining) || amount > invoice?.Remaining) {
        //console.log(TotalInvoice)
        return toast.error("Excess amount is not allowed")
      }
      updatedRow.Credit = amount;
      updatedRow.Debit = 0;
    }

    /* ---------------- INVOICE REF ---------------- */
    if (field === "ClientRef2") {
      const findRef = tableData.find((item) => item.ClientRef2 === value.value)
      if (findRef) {
        return toast.error("Already in the table")
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
  const addNewRow = () => {
    if (MainAccount === "") {
      return toast.error("Please Select Debit Account");
    }
    setTableData([...tableData, {
      id: Date.now(),
      Account: '',
      store: selectedStore || '',
      Client: '',
      Debit: 0,
      Credit: 0,
      Ref: "",
      ClientRef2: "",
      show: false
    }]);
  };

  const removeRow = (id) => {
    setTableData(tableData.filter(row => row.id !== id));
  };

  const TotalDebit = tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
  const TotalCredit = tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);

  const onSubmit = async (data) => {
    if (disabled) return;
    setDisabled(true);

    if (tableData.length === 0) {
      setDisabled(false);
      return toast.error("Please add at least one transaction row");
    }



    const updatedData = {
      ...data,
      ReciptMainAccount: MainAccount,
      ReciptData: tableData,
      Store: selectedStore,
      UpdatedAt: new Date().toISOString(),
      UpdatedBy: loginVendor._id || loginVendor.id
    };
console.log(updatedData)
    try {
      await updateDataFunction(`/PaymentRecived/UpdatePayment/${id}`, updatedData);
      toast.success("Payment Receipt Updated Successfully");
      setTimeout(() => {
        navigate("/PaymentReciptList");
      }, 1500);
    } catch (err) {
      console.error('Update error:', err);
      toast.error("Failed to update payment receipt");
      setDisabled(false);
    }
  };

  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'transparent',
      borderColor: '#ccc',
    }),
    singleValue: (provided) => ({
      ...provided,
      backgroundColor: 'transparent',
      color: '#000',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? 'transparent'
        : state.isFocused
          ? 'rgba(0, 0, 0, 0.05)'
          : 'transparent',
      color: '#000',
    }),
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--pd-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="pd-page-title text-center mb-6">
        Edit Bank Receipt Voucher
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-bg-surface p-4 md:p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="pd-label">Voucher Date</label>
            <input
              type="date"
              disabled={true}
              style={{ height: "38px" }}
              {...register("ReciptDate", { required: true })}
              className="pd-input"
            />
            {errors.ReciptDate && <span className="pd-stat-negative text-sm">This field is required</span>}
          </div>

          <div>
            <label className="pd-label">Store</label>
            <AppSelect
              isDisabled={true}
              onChange={(selectedOption) => setSelectedStore(selectedOption.value)}
              options={ALLStore}
              value={selectedStore ? {
                value: selectedStore,
                label: ALLStore.find((c) => c.value === selectedStore)?.label || selectedStore
              } : null}
              className="basic-single text-sm"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select Store..."
            />
          </div>

          <div>
            <label className="pd-label">Debit Account</label>
            <AppSelect
              onChange={(selectedOption) => {
                setMainAccount(selectedOption.value);
                setupChequeDropdown(selectedOption.value);
              }}
              options={BankAccount}
              value={MainAccount ? {
                value: MainAccount,
                label: `${Account.find((c) => c._id === MainAccount)?.AccountCode} ${Account.find((c) => c._id === MainAccount)?.AccountName}`
              } : null}
              className="basic-single text-sm"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select Debit account..."
            />
          </div>

          <div>
            <label className="pd-label">Voucher Number</label>
            <input
              type="text"
              disabled={true}
              style={{ height: "38px" }}
              {...register("Voucher")}
              className="pd-input"
            />
          </div>

          <div className="w-full col-span-1">
            <label className="block text-sm md:text-base col-span-3 pd-text-body font-semibold mb-2">Received From</label>
            <input
              type="text"
              style={{ height: "38px", width: "100%" }}
              {...register("PaidTo")}
              onChange={(e) => setPaidTo(e.target.value)}
              className="pd-input col-span-5"
            />
            {errors.PaidTo && <span className="pd-stat-negative text-sm">This field is required</span>}
          </div>

          <div className="w-full col-span-1">
            <label className="block text-sm md:text-base col-span-3 pd-text-body font-semibold mb-2">Remarks</label>
            <input
              type="text"
              style={{ height: "38px", width: "100%" }}
              {...register("Remarks")}
              className="pd-input col-span-5"
            />
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr>
                <th className="border p-2 min-w-[200px]">Client</th>
                <th className="border p-2" style={{ width: "8vw" }}>Ref</th>
                <th className="border p-2" style={{ width: "5vw" }}>Debit</th>
                <th className="border p-2" style={{ width: "5vw" }}>Credit</th>
                <th className="border p-2">Narration</th>
                <th className="border p-2" style={{ width: "8vw" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} >
                  <td className="border p-2">
                    <AppAsyncSelect
                      onChange={(selectedOption) =>
                        handleCellChange2(row.id, 'Client', selectedOption || '')
                      }
                      loadOptions={LoadClient}
                      value={
                        row.Client ? {
                          value: row.Client || row.Account,
                          label: `${AllClient.find((c) => c.value === row.Client)?.label}` || AllClient.find((c) => c._id === row.Account)?.label
                        } : {
                          value: row.Account,
                          label: `${AllClient.find((c) => c.value === row.Account)?.label}` 
                        } 
                      }
                      className="basic-single text-sm"
                      classNamePrefix="pd-select"
                      isSearchable
                      defaultOptions={defaultClient}
                      placeholder="Select Client..."
                    />
                  </td>

                  <td className="p-2 border">
                    <AppSelect
                      options={invDrp}
                      onChange={(selectedOption) =>
                        handleCellChange2(row.id, 'ClientRef2', selectedOption || '')
                      }
                      value={row.ClientRef2 ? {
                        value: row.ClientRef2,
                        label: row.ClientRef2
                      } : null}
                      placeholder="Select Reference..."
                    />
                  </td>
                  <td className="border p-2">
                    <AmountInput
                      style={{ width: "100%" }}
                      value={row.Debit}
                      onChange={(raw) => handleCellChange2(row.id, 'Debit', raw)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <AmountInput
                      style={{ width: "100%" }}
                      value={row.Credit}
                      onChange={(raw) => handleCellChange2(row.id, 'Credit', raw)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="p-2 border">
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
                      className="bg-red-500 text-white px-3 py-1 text-xs md:text-sm rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {tableData.length > 0 && (
              <tfoot>
                <tr className="pd-table-footer">
                  <td className="border p-2 text-right" colSpan="2">Total:</td>
                  <td className="border p-2">{formatAmount(TotalDebit)}</td>
                  <td className="border p-2">{formatAmount(TotalCredit)}</td>
                  <td className="border p-2" colSpan="2"></td>
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
                    {amountToWords(TotalCredit)}
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/PaymentReciptList")}
              className="px-4 py-2 pd-bg-muted0 text-white rounded-lg hover:bg-gray-600 text-sm md:text-base"
            >
              Cancel
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
                "Update Bank Receipt"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PaymentReciptEdit;