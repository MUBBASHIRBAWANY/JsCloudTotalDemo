import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppAsyncSelect from '../../../Global/AppAsyncSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../../Api/CRUDFunctions';
import AppSelect from '../../../Global/AppSelect.jsx'
import AmountInput from '../../../Global/AmountInput.jsx'
import { updateDate } from '../../../Global/getDate';
import { logTransaction } from '../logTransaction';
import { formatAmount, amountToWords } from '../../../../utils/amountToWords.js';
import { validateClosingMonth } from '../../../Global/validateClosingMonth';
import { fetchVoucher } from '../../../../Redux/Reducers/VoucherReducer.js';
import GlobalLoader from '../../../Global/GlobalLoader.jsx';
import { fetchAllVoucherDependencies } from '../fetchVoucherDependencies.js';
import { clearEmployeeSubAccount, employeeAccountOption, employeeLineId, takeEmployeeVoucherLine, useEmployeeSubAccounts, withEmployeeAccountOptions } from '../employeeSubAccounts.js';
import { excludeControlAccounts, isDirectClientControl, isDirectTransporterPayable } from '../voucherControlAccounts.js';
import { assertEditableVoucher, parseVoucherByIdResponse } from '../voucherEditAccess.js';
import { CircularProgress } from '@mui/material';

const accountOptionLabel = (item) => {
  const code = item.AccountCode || item.SalesFlowRef || item.OldCode || "";
  const name = item.AccountName || item.CutomerName || item.DistrbutorName || (item.TransporterName ? `${item.TransporterName} Transport` : "");
  return `${code ? `${code} ` : ""}${name}`.trim();
};

const BankReciptVoucherEdit = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
  const Client1 = useSelector((state) => state.Client.client);
  const Transport = useSelector((state) => state.Transport.Transport);
  const City = useSelector((state) => state.City.City);
  const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher);
  const BankAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer);
  const employeeAccounts = useEmployeeSubAccounts();
  const filteredAccount = useMemo(
    () => excludeControlAccounts(
      (Account || []).filter((item) => item.AccountCode?.length > 5),
      BankAccountNumber
    ),
    [Account, BankAccountNumber]
  );
  const Client = useMemo(() => (Client1 || []).map((item) => ({
    ...item,
    DistrbutorName: item.DistrbutorName
      ? `${item.DistrbutorName} (${(City || []).find((c) => c._id === item.City)?.CityName || ""})`
      : item.DistrbutorName,
  })), [Client1, City]);
  const ChqBook = useSelector((state) => state.ChqBook.ChqBook);
  const SoftStore = useSelector((state) => state.Store.Store);
  const editOpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);
  const Reamin = useSelector((state) => state.Remaininginvoice.Remaininginvoice)

const OpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);
  const openingList = Array.isArray(OpeningInvoices) ? OpeningInvoices : [];
  const remainList = Array.isArray(Reamin) ? Reamin : [];
  const TotalInvoice = useMemo(() => remainList.concat(openingList), [remainList, openingList]);

  const store = [{
    _id: "0",
    StoreName: "Head Office",
    StoreCode: "HO"
  }].concat(SoftStore || []);

  const result = useMemo(() => {
    const res = [];
    const from = Number(BankAccountNumber?.BankAccountFrom);
    const to = Number(BankAccountNumber?.BankAccountTo);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return res;
    for (let i = from; i <= to; i++) {
      res.push(i.toString().padStart(5, '0'));
    }
    return res;
  }, [BankAccountNumber?.BankAccountFrom, BankAccountNumber?.BankAccountTo]);

  const ALLStore = useMemo(() => store.map((item) => ({
    label: `${item.StoreName}`,
    value: item._id
  })), [store]);

  const Bank = useMemo(() => filteredAccount.filter((item) => result.some(prefix => item.AccountCode.startsWith(prefix))), [filteredAccount, result]);
  const [MainAccount, setMainAccount] = useState("");
  const [tableData, setTableData] = useState([]);
  console.log(tableData)
  const [PaidTo, setPaidTo] = useState('')
  const [type, setType] = useState("")
  const [selectedStore, setselectedStore] = useState("")
  const [invDrp, setInvDrp] = useState([])
  const [PaidFor, setPaidFor] = useState("Client");
  const [unUsedChq, setUnuseChq] = useState([]);
  const [chq, setChq] = useState('');
  const [disabled, setdisabled] = useState(false)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const [currentVoucher, setCurrentVoucher] = useState(null);

  const getAccountOption = useCallback((clientid, accountId, transporterId, subAccountId) => {
    const employeeOpt = employeeAccountOption(employeeAccounts, subAccountId);
    if (employeeOpt) return employeeOpt;
    const cust = (Client || []).find((item) => String(item._id) === String(clientid));
    if (cust) {
      return {
        value: cust._id,
        label: accountOptionLabel(cust),
        code: cust.AccountCode || cust.SalesFlowRef || "",
      };
    }

    const transporter = (Transport || []).find((item) => String(item._id) === String(transporterId));
    if (transporter) {
      return {
        value: transporter._id,
        label: `${transporter.TransporterName || ""} Transport`.trim(),
        code: transporter.AccountCode || "",
      };
    }

    if (!accountId) return null;
    const acc = (Account || []).find((item) => String(item._id) === String(accountId));
    if (!acc) return null;
    return {
      value: acc._id,
      label: `${acc.AccountCode || ""} ${acc.AccountName || ""}`.trim(),
      code: acc.AccountCode || "",
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
      label: accountOptionLabel(item),
      value: item._id,
      code: item.AccountCode || item.SalesFlowRef || "",
    })), employeeAccounts, search);
  }, [filteredAccount, Client, Transport, employeeAccounts]);

  const BankAccount = useMemo(() => Bank.map((item) => ({
    label: `${item.AccountCode} ${item.AccountName}`,
    value: item._id
  })), [Bank]);

  const startingAccount = useMemo(() => {
    const accounts = (filteredAccount || []).slice(0, 40).map((item) => ({
      label: accountOptionLabel(item),
      value: item._id,
      code: item.AccountCode || "",
    }));
    const clients = (Client || []).slice(0, 40).map((item) => ({
      label: accountOptionLabel(item),
      value: item._id,
      code: item.AccountCode || item.SalesFlowRef || "",
    }));
    const transports = (Transport || []).map((item) => ({
      label: `${item.TransporterName || ""} Transport`.trim(),
      value: item._id,
      code: item.AccountCode || "",
    }));
    return [...accounts, ...clients, ...transports];
  }, [filteredAccount, Client, Transport]);

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
  }, [unUsedChq, Client, Account, MainAccount]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

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

  const handleCellChange = useCallback((id, field, value) => {
    setTableData((prev) => prev.map(row => {
      if (row.id === id) {
        let updatedRow = { ...row, [field]: value };
        if (field == "Client" || field == "Account") {
          const selectedId = value && typeof value === "object" ? value.value : value;
          const employeeLine = takeEmployeeVoucherLine(updatedRow, selectedId, BankAccountNumber, employeeAccounts);
          if (employeeLine.handled) {
            if (employeeLine.error) {
              toast.error(employeeLine.error);
              return row;
            }
            updatedRow = { ...employeeLine.row, Debit: 0, Credit: 0, show: true };
          } else {
          updatedRow = clearEmployeeSubAccount(updatedRow);
          if (!selectedId) {
            updatedRow.Account = "";
            updatedRow.Client = "";
            updatedRow.Transporter = "";
            updatedRow.show = false;
            updatedRow.Debit = 0;
            updatedRow.Credit = 0;
          } else if (isDirectClientControl(selectedId, BankAccountNumber)) {
            toast.error("Ap client main entry karin");
            return row;
          } else if (isDirectTransporterPayable(selectedId, BankAccountNumber)) {
            toast.error("Ap transporter select karin — Transporter Payable direct select nahi hoga");
            return row;
          } else if (selectedId === MainAccount) {
            toast.error("You cannot select the main account as a transaction account");
            return row;
          } else {
            const clientAccount = Client.find((item) => String(item._id) === String(selectedId));
            const transportAccount = (Transport || []).find((item) => String(item._id) === String(selectedId));
            updatedRow.Debit = 0;
            updatedRow.Credit = 0;
            if (clientAccount) {
              updatedRow.Account = BankAccountNumber.Client;
              updatedRow.Client = clientAccount._id;
              updatedRow.Transporter = "";
              updatedRow.show = false;
              updatedRow.ClientLine = "true";
              const totalinvoice = (TotalInvoice || [])
                .filter((item) => String(item.Client) === String(clientAccount._id) || String(item.Distrbutor) === String(clientAccount._id))
                .map((val) => ({
                  label: val.SalesFlowRef
                    ? [val.SalesFlowRef, val.SalesInvoice || val.DitributorInvoiceCode || val.Invoice].filter(Boolean).join(" ")
                    : (val.SalesInvoice || val.DitributorInvoiceCode || val.Invoice || ""),
                  value: val.SalesInvoice || val.DitributorInvoiceCode || val.Invoice,
                }));
              totalinvoice.push({ label: "Advance", value: "Advance" });
              setInvDrp(totalinvoice);
            } else if (transportAccount) {
              updatedRow.Account = BankAccountNumber.TransporterPayable;
              updatedRow.Transporter = transportAccount._id;
              updatedRow.Client = "";
              updatedRow.ClientLine = "";
              updatedRow.show = true;
              if (PaidFor === "Client") updatedRow.Ref = "Advnce";
              setInvDrp([{ label: "Advance", value: "Advance" }]);
            } else {
              const checkWth = Account.find((item) => String(item._id) === String(selectedId));
              updatedRow.Account = checkWth ? checkWth._id : selectedId;
              updatedRow.Client = "";
              updatedRow.Transporter = "";
              updatedRow.ClientLine = "";
              updatedRow.show = true;
              if (PaidFor === "Client") updatedRow.Ref = "Advnce";
              setInvDrp([{ label: "Advance", value: "Advance" }]);
            }
          }
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
  }, [Account, Client, Transport, BankAccountNumber, MainAccount, TotalInvoice, PaidFor, employeeAccounts]);

  const TotalDebit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0), [tableData]);
  const TotalCredit = useMemo(() => tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0), [tableData]);

  const onSubmit = async (data) => {
  if (disabled) return;
  setdisabled(true);

  if (validateClosingMonth(data.VoucherDate, loginVendor)) {
    setdisabled(false);
    return;
  }

  if (!selectedStore) {
    setdisabled(false);
    return toast.error("Please select a Store");
  }

  // Client Credit => ClientRef2 required
  const clientCreditWithoutRef = tableData.find(
    (row) =>
      row.Client &&
      Number(row.Credit) > 0 &&
      !row.ClientRef2
  );

  let updatedTableData = tableData;

  if (clientCreditWithoutRef) {
    updatedTableData = tableData.map((row) => ({
      ...row,
      ClientRef2:
        row.Client && Number(row.Credit) > 0
          ? row.ClientRef2?.trim() || "Advance"
          : row.ClientRef2,
    }));
  }

  data.VoucherType = "BR";
  data.Type = type;

  // ================================
  // Calculate Net Debit
  // ================================
  const totalDebit = updatedTableData.reduce(
    (sum, item) => sum + (Number(item.Debit) || 0),
    0
  );

  const totalCredit = updatedTableData.reduce(
    (sum, item) => sum + (Number(item.Credit) || 0),
    0
  );

  // Main Account Debit = Credit - Debit
  const mainAccountDebit = totalCredit - totalDebit;

  // Agar Debit already Credit se zyada hai
  if (mainAccountDebit < 0) {
    setdisabled(false);
    return toast.error(
      "TotalDebit must not be greater than TotalCredit"
    );
  }

  // ================================
  // Main Account Entry
  // ================================
  const filterAccount =
    mainAccountDebit > 0
      ? [
          {
            Chq:
              updatedTableData[0]?.Chq ||
              updatedTableData[0]?.Slip ||
              "",

            Account: MainAccount,

            Debit: mainAccountDebit,

            Narration:
              updatedTableData[0]?.Narration || "",

            Ref:
              updatedTableData[0]?.Ref ||
              updatedTableData[0]?.ClientRef2 ||
              "",

            show: true,
            store: selectedStore,
            id: Date.now() + Math.random(),
          },
        ]
      : [];

  // ================================
  // Final Data
  // ================================
  const Alldata = updatedTableData.concat(filterAccount);

  data.VoucherMainAccount = MainAccount;
  data.VoucharData = Alldata;
  data.createdBy = loginVendor.firstname;
  data.createDate = updateDate();

  try {
    const res = await updateDataFunction(
      `/Voucher/update/${id}`,
      data
    );

    const allVoucher = EditVoucher;

    const totalVoucher = allVoucher.map((v) =>
      v._id === id ? res.voucher : v
    );

    dispatch(fetchVoucher(totalVoucher));

    await logTransaction({
      data: {
        ...data,
        VoucherNumber:
          data.Voucher ||
          currentVoucher?.VoucherNumber,
      },
      loginVendor,
      type: "Bank Receipt Voucher Edit",
    });

    toast.success(res.message);

    setTimeout(() => {
      navigate("/BankReciptVoucher");
    }, 1000);

  } catch (err) {
    console.error(err);
    setdisabled(false);
    toast.error("Something went wrong");
  }
};

  const SetDrp = (val, opts = {}) => {
    setMainAccount(val);
    if (!opts.skipStoreCheck && (selectedStore === "" || selectedStore == null)) {
      return toast.error("First Select Store")
    }
    setUnuseChq([]);
    setChq('');

    // Step 1: Convert raw data
    const chqSource = Array.isArray(ChqBook) ? ChqBook : [];
    const AllChq = chqSource.map(item => ({
      label: item.chq,
      value: item.id,
      Credit: item.Amount,
      Ref: item.Invoice,
      Client: item.Customer,
      status: item.staus || item.status,
      Chq: item.chq,
      Account: BankAccountNumber?.Client,
      id: Date.now() + Math.random(),
      Type: item.Type
    }));

    // Step 2: Merge by CHQ Number
    const mergedChq = Object.values(
      AllChq.reduce((acc, curr) => {
        if (acc[curr.Chq]) {
          acc[curr.Chq].Credit += curr.Credit;
          acc[curr.Chq].Ref += `, ${curr.Ref}`;
          acc[curr.Chq].ChqRef.push({
            Am: curr.Credit,
            ref: curr.Ref,
            value: curr.value
          });
        } else {
          acc[curr.Chq] = {
            ...curr,
            ChqRef: [{
              Am: curr.Credit,
              ref: curr.Ref,
              value: curr.value
            }]
          };
        }
        return acc;
      }, {})
    );

    // Step 3: Filter pending cheques
    const pendingChq = mergedChq.filter(item => item.status === "Pending");

    // Step 4: Group pending cheques
    const grouped = Object.values(
      pendingChq.reduce((acc, item) => {
        const key = `${item.label}_${item.value}`;
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


  const getData = async () => {
    if (!id) return;

    let voucherData = (Array.isArray(EditVoucher) ? EditVoucher : [])
      .find((item) => String(item._id) === String(id));

    // Always prefer VoucherByID so old BR vouchers outside list limit still open
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
      expectedType: "BR",
      userRights: UserRihts,
      navigate,
      toast,
    })) {
      return;
    }

    const lines = Array.isArray(voucherData.VoucharData)
      ? voucherData.VoucharData
      : (Array.isArray(voucherData.VoucherData) ? voucherData.VoucherData : []);

    setMainAccount(voucherData.VoucherMainAccount || "");
    const firstRow = lines.find((item) => !item.show) || lines[0];
    const rawStore = firstRow?.store ?? firstRow?.Store ?? voucherData.Store;
    const hasStore = rawStore !== undefined && rawStore !== null && rawStore !== "";
    const storeId = hasStore ? String(rawStore) : "0";
    setselectedStore(storeId);

    // Exclude previously auto-generated Main account debit rows (show: true)
    // so they don't get duplicated every time the voucher is edited and saved
    // again. They are regenerated as a single entry on submit.
    setTableData(lines
      .filter((item) => !(item.show === true && String(item.Account) === String(voucherData.VoucherMainAccount)))
      .map((item) => ({
        ...item,
        id: item.id || Date.now() + Math.random(),
        store: item.store !== undefined && item.store !== null && item.store !== ""
          ? String(item.store)
          : storeId,
      })));
    setPaidFor(voucherData.PaidFor || "Client");
    setType(voucherData.Type || "Chq");
    setPaidTo(voucherData.PaidTo || "");
    setCurrentVoucher(voucherData);

    const voucherDate = typeof voucherData.VoucherDate === "string"
      ? voucherData.VoucherDate.split("T")[0]
      : "";
    reset({
      VoucherDate: voucherDate,
      Voucher: voucherData.VoucherNumber || "",
      PaidTo: voucherData.PaidTo || "",
    });
  };
  const handleCellChange2 = useCallback((id, field, value) => {
    setTableData((prev) => {
      let newTableData = [...prev];
      const rowIndex = newTableData.findIndex(row => row.id === id);
      if (rowIndex === -1) return prev;

      let updatedRow = { ...newTableData[rowIndex] };

      if (field === "Account" || field === "Client") {
        const selectedId = value && typeof value === "object" ? value.value : value;
        const employeeLine = takeEmployeeVoucherLine(updatedRow, selectedId, BankAccountNumber, employeeAccounts);
        if (employeeLine.handled) {
          if (employeeLine.error) {
            toast.error(employeeLine.error);
            return prev;
          }
          updatedRow = { ...employeeLine.row, store: selectedStore, Narration: PaidTo, Debit: 0, Credit: 0, show: true };
        } else {
        updatedRow = clearEmployeeSubAccount(updatedRow);
        updatedRow.store = selectedStore;
        updatedRow.Narration = PaidTo;
        updatedRow.ClientRef2 = "";
        if (!selectedId) {
          updatedRow.Account = "";
          updatedRow.Client = "";
          updatedRow.Transporter = "";
          updatedRow.show = false;
          updatedRow.Debit = 0;
          updatedRow.Credit = 0;
          setInvDrp([{ label: "Advance", value: "Advance" }]);
        } else if (isDirectClientControl(selectedId, BankAccountNumber)) {
          toast.error("Ap client main entry karin");
          return prev;
        } else if (isDirectTransporterPayable(selectedId, BankAccountNumber)) {
          toast.error("Ap transporter select karin — Transporter Payable direct select nahi hoga");
          return prev;
        } else if (selectedId === MainAccount) {
          toast.error("You cannot select the main account as a transaction account");
          return prev;
        } else {
          const clientAccount = Client.find((item) => String(item._id) === String(selectedId));
          const transportAccount = (Transport || []).find((item) => String(item._id) === String(selectedId));
          updatedRow.Debit = 0;
          updatedRow.Credit = 0;
          if (clientAccount) {
            updatedRow.Account = BankAccountNumber.Client;
            updatedRow.Client = clientAccount._id;
            updatedRow.Transporter = "";
            updatedRow.show = false;
            updatedRow.ClientLine = "true";
            const totalinvoice = (TotalInvoice || [])
              .filter((item) => String(item.Client) === String(clientAccount._id) || String(item.Distrbutor) === String(clientAccount._id))
              .map((val) => ({
                label: val.SalesFlowRef
                  ? [val.SalesFlowRef, val.SalesInvoice || val.DitributorInvoiceCode || val.Invoice].filter(Boolean).join(" ")
                  : (val.SalesInvoice || val.DitributorInvoiceCode || val.Invoice || ""),
                value: val.SalesInvoice || val.DitributorInvoiceCode || val.Invoice,
              }));
            totalinvoice.push({ label: "Advance", value: "Advance" });
            setInvDrp(totalinvoice);
          } else if (transportAccount) {
            updatedRow.Account = BankAccountNumber.TransporterPayable;
            updatedRow.Transporter = transportAccount._id;
            updatedRow.Client = "";
            updatedRow.ClientLine = "";
            updatedRow.show = true;
            setInvDrp([{ label: "Advance", value: "Advance" }]);
          } else {
            updatedRow.Account = selectedId;
            updatedRow.Client = "";
            updatedRow.Transporter = "";
            updatedRow.ClientLine = "";
            updatedRow.show = true;
            setInvDrp([{ label: "Advance", value: "Advance" }]);
          }
        }
        }
      }

      if (field === "store") {
        updatedRow.store = value?.value || "";
      }
      if (field === "Slip") {
        updatedRow.Slip = value || "";
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
      }

      if (field === "Narration") {
        updatedRow.Narration = value;
      }

      newTableData[rowIndex] = updatedRow;
      return newTableData;
    });
  }, [TotalInvoice, MainAccount, Client, Transport, selectedStore, PaidTo, BankAccountNumber, employeeAccounts]);
  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      setLoading(true);
      try {
        await fetchAllVoucherDependencies(dispatch);
        try {
          const data = await getDataFundtion("/Voucher?&VoucherType=BR");
          if (!cancelled) dispatch(fetchVoucher(data?.data || []));
        } catch (listErr) {
          console.error("BR list refresh failed", listErr);
        }
        if (!cancelled) await getData();
      } catch (err) {
        console.error(err);
        if (!cancelled) toast.error("Failed to open Bank Receipt voucher");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadAll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dispatch]);

  useEffect(() => {
    if (MainAccount && selectedStore !== "" && selectedStore != null) {
      SetDrp(MainAccount, { skipStoreCheck: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [MainAccount, selectedStore]);

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

  return (
    <div className="p-4">
      <GlobalLoader loading={loading} message="Loading Bank Receipt Voucher..." />
      <ToastContainer />
      <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Edit Bank Receipt Voucher</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Voucher Date </label>
            <input
              type="date"
              disabled={loginVendor?.BranchUser == "true" ? true : false}
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
              value={selectedStore !== "" && selectedStore != null ? {
                value: `${selectedStore}`,
                label: `${ALLStore.find((c) => String(c.value) === String(selectedStore))?.label}`
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
            <select
              className='pd-input text-sm md:text-base'
              value={type || "Chq"}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="Chq">Cheque</option>
              <option value="Online">Other</option>
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
                <th className="border p-2 min-w-[200px]">Account / Client</th>
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
                        <AppAsyncSelect
                          onChange={(selectedOption) =>
                            handleCellChange(row.id, 'Account', selectedOption || '')
                          }
                          loadOptions={loadAccounts}
                          defaultOptions={startingAccount}
                          value={getAccountOption(row.Client, row.Account, row.Transporter, employeeLineId(row))}
                          className="basic-single text-sm"
                          classNamePrefix="pd-select"
                          isSearchable
                          placeholder="Select Account..."
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
                        <AppAsyncSelect
                          onChange={(selectedOption) =>
                            handleCellChange2(row.id, 'Account', selectedOption || '')
                          }
                          loadOptions={loadAccounts}
                          defaultOptions={startingAccount}
                          value={getAccountOption(row.Client, row.Account, row.Transporter, employeeLineId(row))}
                          className="basic-single text-sm"
                          classNamePrefix="pd-select"
                          isSearchable
                          placeholder="Select Account..."
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
              "Update Bank Receipt Voucher"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BankReciptVoucherEdit;
