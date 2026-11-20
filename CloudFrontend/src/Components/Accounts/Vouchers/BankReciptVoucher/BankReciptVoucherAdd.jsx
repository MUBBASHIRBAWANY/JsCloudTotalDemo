import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AppAsyncSelect from '../../../Global/AppAsyncSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../../Api/CRUDFunctions';
import AppSelect from '../../../Global/AppSelect.jsx'
import AmountInput from '../../../Global/AmountInput.jsx'
import { formatAmount } from '../../../../utils/amountToWords.js'
import { updateDate } from '../../../Global/getDate';
import { logTransaction } from '../logTransaction';
import { validateClosingMonth } from '../../../Global/validateClosingMonth';
import { fetchVoucher } from '../../../../Redux/Reducers/VoucherReducer.js';
import GlobalLoader from '../../../Global/GlobalLoader.jsx';
import { fetchAllVoucherDependencies } from '../fetchVoucherDependencies.js';
import { clearEmployeeSubAccount, employeeAccountOption, employeeLineId, takeEmployeeVoucherLine, useEmployeeSubAccounts, withEmployeeAccountOptions } from '../employeeSubAccounts.js';
import { excludeControlAccounts, isDirectClientControl, isDirectTransporterPayable } from '../voucherControlAccounts.js';
import { CircularProgress } from '@mui/material';

const BankReciptVoucherAdd = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllVoucherDependencies(dispatch)
      .then(() => setLoading(false))
      .catch(() => setLoading(false));
  }, [dispatch]);
  const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
  const Client = useSelector((state) => state.Client.client)
  const BankAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer)
  const employeeAccounts = useEmployeeSubAccounts()
  const filteredAccount = useMemo(
    () => excludeControlAccounts(
      (Account || []).filter((item) => item.AccountCode?.length > 5),
      BankAccountNumber
    ),
    [Account, BankAccountNumber]
  )
  const ChqBook = useSelector((state) => state.ChqBook.ChqBook)
  const SoftStore = useSelector((state) => state.Store.Store)
  const Reamin = useSelector((state) => state.Remaininginvoice.Remaininginvoice)
  const editOpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const [selectedStore, setselectedStore] = useState("")
  
  const [MainAccount, setMainAccount] = useState("");
  const [tableData, setTableData] = useState([]);
  const [PaidTo, setPaidTo] = useState('')
  const [type, setType] = useState("Chq")
  const [invDrp, setInvDrp] = useState([])
  const [PaidFor, setPaidFor] = useState("Client");
  const [unUsedChq, setUnuseChq] = useState([])
  const [chq, setChq] = useState('')
  const [disabled, setdisabled] = useState(false)
  const [show, setShow] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher);
  console.log(tableData , "Store : selectedStore;")
  const OpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);
      const newOpen = OpeningInvoices.filter((item)=> item.RemaingAmount > 0)
      const TotalInvoice = useMemo(() => Reamin.concat(OpeningInvoices), [Reamin, newOpen])
  const store = useMemo(() => [{
    _id: "0",
    StoreName: "Head Office",
    StoreCode: "HO"
  }].concat(SoftStore), [SoftStore])

  const result = useMemo(() => {
    const arr = [];
    for (let i = BankAccountNumber.BankAccountFrom; i <= BankAccountNumber.BankAccountTo; i++) {
      arr.push(i.toString().padStart(5, '0'));
    }
    return arr;
  }, [BankAccountNumber.BankAccountFrom, BankAccountNumber.BankAccountTo])

  const AllClientDrp = useMemo(() => Account.filter((Acc) => Acc._id == BankAccountNumber.WithholdingTax || Acc._id === BankAccountNumber.UnRealizeAc || Acc._id === BankAccountNumber.UnclaimedAc || Acc._id === BankAccountNumber.pettyCashAccount).concat(Client), [Account, Client, BankAccountNumber])

  const AllClient = useMemo(() => AllClientDrp.map((item) => ({
    label: item.AccountName || ` ${item.CutomerName + " " + item.SalesFlowRef}  `,
    value: item._id
  })), [AllClientDrp])

  const defaultClient = useMemo(() => AllClient.slice(0, 50), [AllClient])

  const ALLStore = useMemo(() => store.map((item) => ({
    label: `${item.StoreName}`,
    value: item._id
  })), [store])

  const Bank = useMemo(() => filteredAccount.filter((item) => result.some(prefix => item.AccountCode.startsWith(prefix))), [filteredAccount, result])

  const BankAccount = useMemo(() => Bank.map((item) => ({
    label: `${item.AccountCode} ${item.AccountName}`,
    value: item._id
  })), [Bank])

  const startingAccount = useMemo(() => filteredAccount.slice(0, 50).map((item) => ({
    label: `${item.AccountCode} ${item.AccountName}`,
    value: item._id
  })), [filteredAccount])

  const TotalDebit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0), [tableData])
  const TotalCredit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0), [tableData])

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
  }, [filteredAccount, employeeAccounts])

  const LoadClient = useCallback(async (inputValue) => {
    const filtered = AllClient
      .filter((item) =>
        item.label.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 50);
    return filtered
  }, [AllClient])

  const loadTableData = useCallback((value) => {
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
  }, [unUsedChq, Client, Account, MainAccount])

  const addNewRow = useCallback(() => {
    if (MainAccount == "") {
      return toast.error("Please Select Debit Account")
    }
    setTableData((prev) => [...prev, {
      id: Date.now(),
      Account: '',
      store: '',
      Client: '',
      Debit: 0,
      Credit: 0,
      Ref: "",
      ClientRef2: ""
    }]);
  }, [MainAccount]);

  const removeRow = useCallback((id) => {
    setTableData((prev) => prev.filter(row => row.id !== id));
  }, []);

  const handleCellChange2 = useCallback((id, field, value) => {
    
    setTableData((prev) => {
      let newTableData = [...prev];
      const rowIndex = newTableData.findIndex(row => row.id === id);
      if (rowIndex === -1) return prev;

      let updatedRow = { ...newTableData[rowIndex] };

      if (
        (field === "Account" || field === "Client") &&
        (value === "" || value?.value === "")
      ) {
        updatedRow.Account = "";
        updatedRow.Store = selectedStore
        updatedRow.Client = "";
        updatedRow.Debit = 0;
        updatedRow.Credit = 0;
        updatedRow.ClientRef2 = "";
        setInvDrp([]);
      }

      if (field === "store") {
        updatedRow.store = value?.value || "";
      }
        if (field === "Slip") {
        updatedRow.Slip = value || "";
      }

      if (field === "Account") {
        const employeeLine = takeEmployeeVoucherLine(updatedRow, value, BankAccountNumber, employeeAccounts);
        if (employeeLine.handled) {
          if (employeeLine.error) {
            toast.error(employeeLine.error);
            return prev;
          }
          updatedRow = { ...employeeLine.row, Narration: PaidTo, store: selectedStore, Debit: 0, Credit: 0 };
        } else {
        updatedRow = clearEmployeeSubAccount(updatedRow);
        if (isDirectClientControl(value, BankAccountNumber)) {
          toast.error("Ap client main entry karin");
          return prev;
        }
        if (isDirectTransporterPayable(value, BankAccountNumber)) {
          toast.error("Ap transporter select karin — Transporter Payable direct select nahi hoga");
          return prev;
        }
        console.log(selectedStore , "selectedStore")
        updatedRow.Account = value?.value || "";
        updatedRow.Narration = PaidTo;
        updatedRow.store = selectedStore;
        updatedRow.Debit = 0;
        updatedRow.Credit = 0;
        }
      }

      if (field === "Client") {
        updatedRow.ClientRef2 = "";
        const findClinet = Client.find((item) => item._id === value.value)
        updatedRow.store = selectedStore;

        if (findClinet) {
          updatedRow.Client = value?.value || "";
          const totalinvoice = TotalInvoice
            .filter(item => item.Client === value?.value)
            .map(val => ({
              label: val.SalesFlowRef
                ? [val.SalesFlowRef, val.SalesInvoice].filter(Boolean).join(" ")
                : val.Invoice,
              value: val.SalesInvoice || val.Invoice
            }));
          totalinvoice.push({
            label: "Advance",
            value: "Advance",
          });
          updatedRow.store = selectedStore
          setInvDrp(totalinvoice);
        }
        else {
          updatedRow.Account = value?.value;
          updatedRow.Debit = 0;
          updatedRow.show = true
          updatedRow.Credit = 0;
          updatedRow.Narration = PaidTo;
        }

        if (value?.value === MainAccount) {
          toast.error("You cannot select the main account as a transaction account");
          updatedRow.Account = "";
        } else if (findClinet) {
          // Customer select hone par Account hamesha Admin.Client (Client control account) hona chahiye
          updatedRow.Account = BankAccountNumber.Client;
          updatedRow.Debit = 0;
          updatedRow.Credit = 0;
          updatedRow.Narration = PaidTo;
        } else {
          updatedRow.Account = value?.value;
          updatedRow.Debit = 0;
          updatedRow.Credit = 0;
          updatedRow.Narration = PaidTo;
        }
      }

      if (field === "Debit") {
        updatedRow.Debit = Number(value) || 0;
        updatedRow.Credit = 0;
      }

      if (field === "Credit") {
        const invoice = TotalInvoice.find((val) => val.Invoice == updatedRow.ClientRef2 || val.SalesInvoice === updatedRow.ClientRef2)
        if (value > invoice?.RemainingAmount || value > invoice?.RemaingAmount) {
          return prev;
        }
        updatedRow.Credit = Number(value) || 0;
        updatedRow.Debit = 0;
      }

      if (field === "ClientRef2") {
        const findRef = newTableData.find((item) => item.ClientRef2 === value.value)
        if (findRef) {
          return prev;
        }
        updatedRow.ClientRef2 = value?.value || "";
        if (value.value !== "Advance") {
          const RemainInvAmt = TotalInvoice.find(
            val =>
              val.SalesInvoice === value?.value ||
              val.Invoice === value?.value
          );
          if (RemainInvAmt) {
            updatedRow.Type = RemainInvAmt.status ? "Opening" : "Current";
            updatedRow.Credit =
              RemainInvAmt.RemainingAmount ||
              RemainInvAmt.RemaingAmount ||
              0;
          }
        } else {
          updatedRow.Credit = 0;
        }
      }

      if (field === "Narration") {
        updatedRow.Narration = value;
      }

      newTableData[rowIndex] = updatedRow;
      return newTableData;
    });
  }, [Client, selectedStore, TotalInvoice, MainAccount, PaidTo, BankAccountNumber, employeeAccounts]);

  const handleCellChange = useCallback((id, field, value) => {
    console.log(id, field, value)
    setTableData((prev) => prev.map(row => {
      if (row.id === id) {
        let updatedRow = { ...row, [field]: value };
        if (field == "Client") {
          const findClinet = Client.find((item) => item._id == value.value)
          if (findClinet) {
            updatedRow.Account = BankAccountNumber.Client
            updatedRow.Client = value.value
            updatedRow.show = false
          }
          else {
            const checkWth = Account.find((item) => item._id == value.value)
            updatedRow.Account = checkWth ? checkWth._id : value.value
            updatedRow.Client = ""
            updatedRow.show = true
          }
if (field == "Ref") {
updatedRow.Ref = value
}
          if (updatedRow.Account != row.Account) {
            updatedRow.Debit = 0
            updatedRow.Credit = 0
          }
        }

        if (updatedRow.Account == "") {
          updatedRow.Debit = 0
          updatedRow.Credit = 0
        }
        if (field == "store") {
          updatedRow.store = value.value
        }
        if (field == "Type") {
          updatedRow.store = value
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
          if (value.value === MainAccount) {
            toast.error("You cannot select the main account as a transaction account");
            updatedRow.Account = ""
          }
          else {
            updatedRow.Account = value.value
            updatedRow.Debit = 0
            updatedRow.Credit = 0
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
        if (field == 'Narration') {
          updatedRow.Narration = value
        }
        return updatedRow;
      }
      return row;
    }));
  }, [Account, Client, BankAccountNumber, MainAccount, employeeAccounts]);
  
  const onSubmit = async (data) => {
    if (disabled) return;
    setdisabled(true);

    if (validateClosingMonth(data.VoucherDate, loginVendor)) {
      setdisabled(false);
      return;
    }

    // Check: store must be selected
    if (!selectedStore) {
      setdisabled(false);
      return toast.error("Please select a Store");
    }

    // Check: Client row with Credit must have ClientRef2
    const clientCreditWithoutRef = tableData.find(
      (row) => row.Client && Number(row.Credit) > 0 && !row.ClientRef2
    );
    if (clientCreditWithoutRef) {
      setdisabled(false);
      return toast.error("Client row on Credit side must have an Invoice Reference (Ref)");
    }

    data.VoucherType = "BR";
    let filterAccount = "";

    // 🔄 Build filterAccount
    if (type === "Online") {
      if (TotalDebit > TotalCredit) {
        setdisabled(false);
        return toast.error("TotalDebit must not be greater than TotalCredit");
      } else {
        filterAccount = [{
          Chq: tableData[0]?.Chq || tableData[0]?.Slip,
          Account: MainAccount,
          Debit: TotalCredit - TotalDebit,
          Narration: tableData[0]?.Narration,
          Ref: tableData[0]?.Ref || tableData[0]?.ClientRef2,
          show: true,
          id: Date.now() + Math.random()
        }];
      }
    } else {
      const filter = tableData.filter((item) => item.Credit > 0);

      // Create a single debit entry on the Main account instead of one per credit row
      if (filter.length === 0) {
        filterAccount = [];
      } else {
        const totalCredit = filter.reduce((sum, item) => sum + (parseFloat(item.Credit) || 0), 0);
        filterAccount = [{
          Chq: filter[0].Chq || filter[0].Slip,
          Account: MainAccount,
          Debit: totalCredit,
          Narration: filter[0].Narration,
          Ref: filter[0].Ref || filter[0].ClientRef2,
          show: true,
          store: selectedStore,
          id: Date.now() + Math.random()
        }];
      }
    }

    const Alldata = tableData.concat(filterAccount);

    data.VoucherMainAccount = MainAccount;
    data.VoucharData = Alldata;
    data.Type = type;
    data.createdBy = loginVendor.firstname;
    data.createDate = updateDate();

    try {
      // 📅 Extract Year & Month
      const date = new Date(data.VoucherDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');

      const prefix = `BR${year}${month}`; // JV202605
      console.log(prefix)
      // 🔍 Get last voucher
      const code = await createDataFunction(
        `/Voucher/GetLastVouherByDate/BR?Voucherdate=${data.VoucherDate}`, { prefix: prefix });

      console.log(code)
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

      console.log("Final Data:", data);

      // 🚀 Save
      const res = await createDataFunction("/Voucher", data);
      const allVoucher = EditVoucher;
      const totalVoucher = [...allVoucher, res.voucher];
      dispatch(fetchVoucher(allVoucher || []));

      await logTransaction({
        data,
        loginVendor,
        type: 'Bank Receipt Voucher'
      });

      toast.success(res.message || "Voucher Created Successfully");

      setTimeout(() => {
        navigate(`/BankReciptVoucherView/${res.voucher._id}`);
      }, 1000);

    } catch (error) {
      setdisabled(false);
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  const SetDrp = (val) => {
    setMainAccount(val)
    if (selectedStore === "") {
      return toast.error("First Select Store")
    }
    setUnuseChq([])
    setChq('')
    //console.log(ChequeBook)
    const AllChq = ChqBook.map(item => ({
      label: item.chq,
      value: item.id,
      Credit: Number(item.Amount),
      Ref: item.Invoice,
      Store: selectedStore,
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
    const unUsedchq = result.filter((item) => item.status == "pending")
      .map((ch) => ({
        value: ch.ref,
        label: ch.chq
      }))

    setUnuseChq(unUsedchq)
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

  return (
    <div className="p-4">
      <GlobalLoader loading={loading} message="Loading Bank Receipt Voucher..." />
      <ToastContainer />
      <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Bank Receipt Voucher</h1>

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
            <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Store </label>
            <AppSelect
              isDisabled={tableData.length > 0 ? true : false}
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
            <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Receiving Type </label>
            <select className='pd-input text-sm md:text-base' onChange={(e) => setType(e.target.value)}>
              <option value="Chq" selected={true}> Cheque </option>
              <option value="Online" > Other </option>
            </select>
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
          {PaidFor == "Client" ?
            type == "Chq" ? <div>
              <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Cheque </label>
              <AppSelect
                onChange={(selectedOption) => loadTableData(selectedOption)}
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
              : null : null}
          <div className='w-full col-span-1'>
            <label className="block text-sm md:text-base col-span-3 pd-text-body font-semibold mb-2">Received From </label>
            <input
              type="text"
              style={{ height: "38px", width: "100%" }}
              {...register("PaidTo")}
              onChange={(e) => setPaidTo(e.target.value)}
              className="pd-input text-sm md:text-base col-span-5"
            />
          </div>



          <div className='flex gap-2 col-span-1'>
            <label className="text-sm md:text-base pd-text-body font-semibold mb-2">
              Received Customer
            </label>
            <input
              type="radio"
              name="PaidFor"
              value="Client"
              disabled={tableData.length !== 0 ? true : false}
              onChange={(e) => setPaidFor(e.target.value)}
              checked={PaidFor === "Client"}
              
            />

            <label className="text-sm md:text-base pd-text-body font-semibold mb-2">
              Received Other
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
                <th className="border p-2 min-w-[200px]">{PaidFor == "other" ? "Account" : "Client"}</th>
                <th className="border p-2" style={{ width: "8vw" }}>Ref</th>
                {PaidFor !== "other" ? <th className="border p-2" style={{ width: "8vw" }}>chqNumber</th> : null}
                <th className="border p-2" style={{ width: "5vw" }}>Debit</th>
                <th className="border p-2" style={{ width: "5vw" }}>Credit</th>
                <th className="border p-2">Narration</th>
                <th className="border p-2" style={{ width: "8vw" }}>Action</th>

              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (

                type == "Chq" ?
                  <>
                    <tr key={row.id} className="hover:pd-bg-muted">
                      <td className="border p-2">
                        {PaidFor == "Client" ?
                          <AppAsyncSelect
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
                                label: `${Client.find((c) => c._id === row.Client)?.CutomerName}`
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
                      <td colSpan={1} className="p-2 border-t">
                        <input
                          type="text"
                          value={row.Ref || ''}
                          onChange={(e) => handleCellChange(row.id, 'Ref', e.target.value)}
                          placeholder="Enter Ref..."
                          className="w-full p-2 text-xs md:text-sm border rounded"
                        />
                      </td>
                      {PaidFor !== "other" ? <td colSpan={1} className="p-2 border-t">
                        <span className='w-full p-2 text-xs md:text-sm '> {row.Chq} </span>
                      </td> : null}
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
                  :
                  <>
                    <tr key={row.id} className="hover:pd-bg-muted">
                      <td className="border p-2">
                        {PaidFor == "Client" ? <AppAsyncSelect
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
                              label: `${Client.find((c) => c._id === row.Client)?.CutomerName}`
                            } : null)}
                          className="basic-single text-sm"
                          classNamePrefix="pd-select"
                          isSearchable
                          defaultOptions={defaultClient}
                          placeholder="Select Client..."
                        /> : <AppAsyncSelect
                          onChange={(selectedOption) =>
                            handleCellChange2(row.id, 'Account', selectedOption || '')
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
                        <input
                          style={{ width: "5vw" }}
                          type="text"
                          value={row.Slip}
                          onChange={(e) => handleCellChange2(row.id, 'Slip', e.target.value)}
                          className="w-full p-1 text-xs md:text-sm border rounded"
                        />
                      </td>
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
                  {PaidFor !== "other" ? <td className="border p-2"></td> : null}
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
            disabled={!MainAccount || !selectedStore}
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
              "Create Bank Receipt Voucher"
            )}
          </button>
        </div>
      </form >
    </div >
  )
}

export default BankReciptVoucherAdd