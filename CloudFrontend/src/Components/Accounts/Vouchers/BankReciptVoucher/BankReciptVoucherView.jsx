import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


import { createDataFunction, deleteDataFunction, getDataFundtion } from "../../../../Api/CRUDFunctions";
import { fetchVoucher } from "../../../../Redux/Reducers/VoucherReducer";
import { fetchAllVoucherDependencies } from '../fetchVoucherDependencies';
import { employeeLineLabel, useEmployeeSubAccounts } from '../employeeSubAccounts';
import GlobalLoader from '../../../Global/GlobalLoader.jsx';
import { formatAmount, amountToWords } from '../../../../utils/amountToWords.js';

const BankReciptVoucherView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
  const employeeAccounts = useEmployeeSubAccounts();
  const Transport = useSelector((state) => state.Transport.Transport);
  const Client = useSelector((state) => state.Client.client);
  const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher);
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const PostBankReceipt = UserRihts.find((item) => item == "Post Bank Receipt")
  const UnPostBankReceipt = UserRihts.find((item) => item == "UnPost Bank Receipt")
  const canEditBankReceipt = Array.isArray(UserRihts) && UserRihts.includes("Edit Bank Receipt")

  const [mergedEntities, setMergedEntities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [depsLoading, setDepsLoading] = useState(true);
  const [voucherData, setVoucherData] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [headerData, setHeaderData] = useState({});
  //console.log(tableData)
  const [nextVoucherId, setNextVoucherId] = useState(null);
  const store = [{
        _id: "0",
        StoreName: "Head Office",
        StoreCode: "HO"
    }].concat(useSelector((state) => state.Store.Store));
  const [prevVoucherId, setPrevVoucherId] = useState(null);
  const handleCellChange2 = async (id, field, value) => {
    let newTableData = [...tableData];
   
    const rowIndex = newTableData.findIndex(row => row.id === id);
    if (rowIndex === -1) return;

    let updatedRow = { ...newTableData[rowIndex], [field]: value };
    const checking = tableData.find((item) => item.id == id);



    // Reset debit/credit if no account
    if (updatedRow.Account === "" || updatedRow.Client === "") {
      updatedRow.Debit = 0;
      updatedRow.Credit = 0;
      setInvDrp([])
      updatedRow.ClientRef2 = ""
    }

    // Handle store field
    if (field === "store") {
      updatedRow.store = value.value;
    }
    if (field === "Account") {
      updatedRow.Account = value.value
    }
    // Handle Account field
    if (field === "Client") {
      updatedRow.Client = value.value
      const totalinvoice = Reamin.filter((item) => item.Client == value.value).map((val) => ({
        label: val.SalesInvoice,
        value: val.SalesInvoice

      }))
      setInvDrp(totalinvoice)

      if (value.value === MainAccount || value.value === MainAccount) {
        toast.error("You cannot select the main account as a transaction account");
        updatedRow.Account = "";
      } else {
        updatedRow.Account = value.value;
        updatedRow.Debit = 0;
        updatedRow.Credit = 0;
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
      //console.log(value)
      updatedRow.ClientRef2 = value.value;
      const RemainInvAmt = Reamin.find((val) => val.SalesInvoice === value.value)?.RemainingAmount
      updatedRow.Credit = RemainInvAmt
    }

    // Update row in the new table data
    newTableData[rowIndex] = updatedRow;

    // Finally, update state
    setTableData(newTableData);
  };
  // console.log("=== RENDER STATE ===");
  // console.log("tableData:", tableData);
  // console.log("mergedEntities:", mergedEntities);
  // console.log("voucherData:", voucherData);

  // Fetch dependencies on mount (handles page refresh)
  useEffect(() => {
    const loadAll = async () => {
      try {
        await fetchAllVoucherDependencies(dispatch);
        // Fetch vouchers if store is empty (handles page refresh)
        if (!EditVoucher || EditVoucher.length === 0) {
          const data = await getDataFundtion("/Voucher?&VoucherType=BR");
          dispatch(fetchVoucher(data.data || []));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setDepsLoading(false);
      }
    };
    loadAll();
  }, [dispatch]);

  useEffect(() => {
    if (!id) return;

    // Pehle Redux se try karo
    const data = EditVoucher?.find(
      (item) => String(item._id) === String(id)
    );

    if (data) {
      // ✅ Redux mein mila — seedha set karo
      setVoucherData(data);
      setTableData(data.VoucharData || []);
      setHeaderData({
        VoucherDate: data.VoucherDate?.split("T")[0],
        VoucherNumber: data.VoucherNumber,
        PaidTo: data.PaidTo,
        PaidFor: data.PaidFor,
        MainAccount: data.VoucherMainAccount,
        createDate: data.createDate,
        createdBy: data.createdBy
      });
    }

    // Always load entities so Transporter names resolve
    const fetchFromAPI = async () => {
      setLoading(true);
      try {
        const res = await getDataFundtion(`/Voucher/VoucherByID/${id}`);
        const voucher = res?.voucher || (!Array.isArray(res?.data) ? res?.data : null);

        if (!data && voucher) {
          setVoucherData(voucher);
          setTableData(voucher.VoucharData || []);
          setHeaderData({
            VoucherDate: voucher.VoucherDate?.split("T")[0],
            VoucherNumber: voucher.VoucherNumber,
            PaidTo: voucher.PaidTo,
            PaidFor: voucher.PaidFor,
            MainAccount: voucher.VoucherMainAccount,
            createDate: voucher.createDate,
            createdBy: voucher.createdBy
          });
        }

        if (Array.isArray(res?.data)) {
          setMergedEntities(res.data);
        }
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFromAPI();
  }, [id, EditVoucher]);
   const getStoreLabel = (storeId) => {
  if (!storeId) return "";

  if (Array.isArray(store) && store.length) {
    const s = store.find(
      (x) => String(x._id) === String(storeId)
    );
    if (s) return toCapitalize(s.StoreName || "");
  }

  if (Array.isArray(mergedEntities) && mergedEntities.length) {
    const s = mergedEntities.find(
      (x) =>
        String(x._id) === String(storeId) &&
        x.type === "Store"
    );
    if (s) return toCapitalize(s.StoreName || "");
  }

  return "";
};

  // Totals
  const filteredData = tableData.filter(row => row.Account !== headerData.MainAccount);
  const mainAccountDebit = tableData
    .filter(row => row.Account === headerData.MainAccount)
    .reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
  const TotalDebit = filteredData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
  const TotalCredit = filteredData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);

  // Helpers
const toCapitalize = (str) => {
  if (!str) return '';
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

const getAccountLabel = (accountId) => {
  if (!accountId) return "";

  // Redux
  if (Account?.length) {
    const acc = Account.find((a) => String(a._id) === String(accountId));
    if (acc) return toCapitalize(`${acc.AccountCode} ${acc.AccountName}`);
  }

  // API fallback
  if (mergedEntities?.length) {
    const merged = mergedEntities.find(
      (a) => String(a._id) === String(accountId) && a.type === "Account"
    );

    if (merged) return toCapitalize(merged.AccountName);
  }

  return "Unknown Account";
};

  const getClientLabel = (clientId) => {
    if (!clientId) return "";

    // 1️⃣ Redux se
    if (Client?.length) {
      const cli = Client.find((c) => String(c._id) === String(clientId));
      if (cli) return toCapitalize(cli.CutomerName || cli.DistrbutorName || "");
    }

    // 2️⃣ API fallback
    if (mergedEntities?.length) {
      const merged = mergedEntities.find((c) => String(c._id) === String(clientId));

      if (!merged) return "";

      switch (merged.type) {
        case "Client":
          return toCapitalize(merged.CutomerName || "");
        case "Transporter":
          return toCapitalize(merged.TransporterName || "");
        case "Vendor":
          return toCapitalize(merged.VendorName || "");
        default:
          return "";
      }
    }

    return "";
  };

  const getTransporterLabel = (transporterId) => {
    if (!transporterId) return "";
    const tId = typeof transporterId === "object"
      ? String(transporterId._id || transporterId.value || "")
      : String(transporterId);
    if (!tId) return "";
    if (Array.isArray(Transport) && Transport.length) {
      const t = Transport.find((x) => String(x._id) === tId);
      if (t) return toCapitalize((t.OldCode ? t.OldCode + " " : "") + (t.TransporterName || "") + " Transport");
    }
    if (Array.isArray(mergedEntities) && mergedEntities.length) {
      const t = mergedEntities.find(
        (x) => String(x._id) === tId && (x.type === "Transporter" || x.TransporterName)
      );
      if (t) return toCapitalize((t.OldCode ? t.OldCode + " " : "") + (t.TransporterName || "") + " Transport");
    }
    return "";
  };
  const nevigate = useNavigate("/BankReciptVoucher")
  // PDF
  const handlePrintPDF = async () => {
    const input = document.getElementById("voucher-print-section");
    if (!input) return;
    const printContent = input.innerHTML;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
        <html>
        <head>
            <title>Bank Receipt Voucher</title>
            <style>
                    @page { size: A4 portrait; margin: 10mm; }
                *, *::before, *::after { box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; margin: 0; color: #000; background: #fff; width: 100%; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
                th { background: #f0f0f0; font-weight: 600; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: 700; }
                .underline { text-decoration: underline; }
                .mb-4 { margin-bottom: 12px; }
                .mb-6 { margin-bottom: 18px; }
                .mb-10 { margin-bottom: 30px; }
                .mt-4 { margin-top: 12px; }
                .mt-10 { margin-top: 30px; }
                .grid { display: grid; gap: 12px; }
                .grid-cols-2 { grid-template-columns: 1fr 1fr; }
                .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
                .text-sm { font-size: 12px; }
                .text-2xl { font-size: 22px; }
                .text-xl { font-size: 18px; }
                .border-l-4 { border-left: 4px solid #475569; }
                .pl-4 { padding-left: 16px; }
                .py-1 { padding-top: 4px; padding-bottom: 4px; }
                .uppercase { text-transform: uppercase; }
                .tracking-wide { letter-spacing: 0.05em; }
                .leading-7 { line-height: 1.75rem; }
                @media print { body { padding: 0; margin: 0; } .no-print { display: none !important; } }
            </style>
        </head>
        <body>
            ${printContent}
            <div style="margin-top:30px;font-size:10px;text-align:center;color:#555;border-top:1px solid #ccc;padding-top:8px;">
                Developed by JS International | Website: https://jaffersons.com/ | Contact: 0301-8251291
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  // Excel
  const handlePrintExcel = () => {
    const header = [
      ["Pearl Dynamic"],
      ["Bank Receipt Voucher"],
      [`Voucher Number: ${headerData.VoucherNumber}`],
      [`Voucher Date: ${headerData.VoucherDate}`],
      [`Received From: ${headerData.PaidTo}`],
      [],
      [headerData.PaidFor === "other" ? "Account" : "Client", "Ref", "Cheque Number", "Debit", "Credit", "Narration"],
    ];
    const rows = filteredData.map((row) => [
      employeeLineLabel(employeeAccounts, row) || getClientLabel(row.Client) || getTransporterLabel(row.Transporter) || getAccountLabel(row.Account),
      row.Ref || "",
      row.Chq || "",
      row.Debit || 0,
      row.Credit || 0,
      row.Narration || "",
    ]);
    const totalRow = ["", "", "Total", mainAccountDebit, TotalCredit, ""];
    const data = [...header, ...rows, totalRow];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Voucher");
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), `BankReceiptVoucher_${headerData.VoucherNumber}.xlsx`);
  };
  const postStatus = async => {

  }
  // Word
  const handlePrintWord = () => {
    const tableRows = filteredData.map(
      (row) => `
      <tr>
        <td>${employeeLineLabel(employeeAccounts, row) || getClientLabel(row.Client) || getTransporterLabel(row.Transporter) || getAccountLabel(row.Account)}</td>
        <td>${row.Ref || ""}</td>
        <td>${row.Chq || ""}</td>
        <td>${row.Debit > 0 ? `(${row.Debit})` : 0}</td>
        <td>${row.Credit || 0}</td>
        <td>${row.Narration || ""}</td>
      </tr>`
    ).join("");
    const totalRow = `
      <tr>
        <td colspan="3" style="text-align:right;"><strong>Total:</strong></td>
        <td><strong>${mainAccountDebit}</strong></td>
        <td><strong>${TotalCredit}</strong></td>
        <td></td>
      </tr>`;
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Voucher</title></head>
      <body>
        <h1 style="text-align:center;">Pearl Dynamic</h1>
        <h2 style="text-align:center;">Bank Receipt Voucher</h2>
        <table>
          <tr><td><strong>Voucher Number:</strong></td><td>${headerData.VoucherNumber}</td></tr>
          <tr><td><strong>Voucher Date:</strong></td><td>${headerData.VoucherDate}</td></tr>
          <tr><td><strong>Received From:</strong></td><td>${headerData.PaidTo}</td></tr>
          <tr><td><strong>Main Account:</strong></td><td>${getAccountLabel(headerData.MainAccount)}</td></tr>
        </table>
        <br/>
        <table border="1" cellspacing="0" cellpadding="5" width="100%">
          <thead>
            <tr>
              <th>${headerData.PaidFor === "other" ? "Account" : "Client"}</th>
              <th>Ref</th>
              <th>Cheque Number</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Narration</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            ${totalRow}
          </tbody>
        </table>
      </body>
      </html>`;
    const blob = new Blob(["\ufeff", content], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `BankReceiptVoucher_${headerData.VoucherNumber}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePostUnpost = async (status) => {
    try {
      //console.log(voucherData)
      const res = await createDataFunction(`/Voucher/CustomerRecipt/${id}`, voucherData)
      toast.success(res)
      setTimeout(() => {
        nevigate("/BankReciptVoucher")
      }, 1000)
    } catch (err) {

    }
  }


  // Delete
  // const deleteVoucher = async () => {
  //   try {
  //     await deleteDataFunction(`/Voucher/delete/${id}`);
  //     const data = await getDataFundtion(`/Voucher${id}`);
  //     dispatch(fetchVoucher(data.data));
  //     toast.success("Voucher Deleted Successfully");
  //     navigate("/BankReciptVoucherList");
  //   } catch (err) {
  //     toast.error("Something went wrong");
  //   }
  // };

  const handleNextVoucher = () => {
    if (nextVoucherId) {
      navigate(`/BankReciptVoucherView/${nextVoucherId}`);
    }
  };

  const handlePrevVoucher = () => {
    if (prevVoucherId) {
      navigate(`/BankReciptVoucherView/${prevVoucherId}`);
    }
  };

  if (depsLoading) return <GlobalLoader loading={true} message="Loading Bank Receipt Voucher..." />;

  if (!voucherData) {
    return <p className="text-center mt-6">Loading voucher...</p>;
  }

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Bank Receipt Voucher</h1>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <button
          onClick={() => navigate("/BankReciptVoucher")}
          className="pd-btn-outline text-sm md:text-base"
        >
          Back
        </button>
        
        <button
          onClick={handlePrintPDF}
          className="pd-btn-danger px-4 py-2"
        >
          Print PDF
        </button>
        <button
          onClick={handlePrintExcel}
          className="pd-btn-success px-4 py-2 transition"
        >
          Print Excel
        </button>
        <button
          onClick={handlePrintWord}
          className="pd-btn-save transition"
        >
          Print Word
        </button>
        <button
          onClick={handlePrevVoucher}
          disabled={!prevVoucherId}
          className={`px-4 py-2 rounded transition ${prevVoucherId
            ? 'pd-btn-nav'
            : 'pd-btn-nav pd-btn-nav--disabled'
          }`}
        >
          Previous Voucher
        </button>
        <button
          onClick={handleNextVoucher}
          disabled={!nextVoucherId}
          className={`px-4 py-2 rounded transition ${nextVoucherId
            ? 'pd-btn-nav'
            : 'pd-btn-nav pd-btn-nav--disabled'
          }`}
        >
          Next Voucher
        </button>
        {canEditBankReceipt ? (
          <button
            className={`px-4 py-2 rounded transition pd-bg-muted0 text-yellow-50`}
            onClick={() => navigate(`/BankReciptVoucherEdit/${id}`)}
          >
            Edit Voucher
          </button>
        ) : null}
        {/* <button
          className={`px-4 py-2 rounded transition bg-red-500 text-yellow-50`}
          onClick={() => deleteVoucher()}
        >
          Delete Voucher
        </button> */}
      </div>

      <div className="pd-card p-4 md:p-6">
        <div id="voucher-print-section" style={{ padding: '24px', border: '1px solid #ccc', background: '#fff', color: '#000', fontFamily: 'Arial, sans-serif' }}>

          {/* Top header line */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
            <span>Date & Time : {new Date().toLocaleString()}</span>
            <span>Page : 1</span>
            <span>User : {loginVendor?.firstname || loginVendor?.Name || loginVendor?.name || ''}</span>
          </div>

          {/* Company & Voucher Title */}
          <div style={{ marginBottom: '16px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Pearl Dynamic (pvt) ltd</h1>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>BANK RECEIPT VOUCHER</h2>
          </div>

          {/* Voucher Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 40px', fontSize: '13px', marginBottom: '20px' }}>
            <div><strong>VOUCHER #</strong> &nbsp;: {headerData.VoucherNumber}</div>
            <div><strong>VOUCHER DATE</strong> : {headerData.VoucherDate}</div>
            <div><strong>ACCOUNT DEBITED</strong> &nbsp;: {getAccountLabel(headerData.MainAccount)}</div>
            <div><strong>ACCOUNT CODE</strong> : {getAccountLabel(headerData.MainAccount)}</div>
            <div><strong>RECEIVED FROM :</strong> &nbsp;: {headerData.PaidTo}</div>
            <div></div>
          </div>

          {/* Data Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', width: '70px' }}>CHQ DT. /<br/>CHQ NO.</th>
                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', width: '70px' }}>A/C. CODE</th>
                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>ACCOUNT NAME</th>
                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', width: '80px' }}>DEPARTMENT</th>
                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>COMMENTS</th>
                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', width: '80px' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', verticalAlign: 'top' }}>
                    {row.Chq || row.Slip || row.Ref || row.ClientRef2 || ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>
                    {getAccountLabel(row.Account).split(' ')[0]}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                    {employeeLineLabel(employeeAccounts, row) || getClientLabel(row.Client) || getTransporterLabel(row.Transporter) || getAccountLabel(row.Account)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                     {getStoreLabel(row.store)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                    {row.Narration || ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                    {row.Debit > 0 ? `(${formatAmount(row.Debit)})` : formatAmount(row.Credit)}
                  </td>
                </tr>
              ))}
              {filteredData.length > 0 && (
                <tr>
                  <td colSpan="5" style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>TOTAL AMOUNT</td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatAmount(mainAccountDebit)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Amount in words */}
          <div style={{ marginBottom: '40px', fontSize: '13px' }}>
            <strong>AMOUNT IN WORDS:</strong> <span style={{ textDecoration: 'underline', marginLeft: '8px' }}>{amountToWords(mainAccountDebit)}</span>
          </div>

          {/* Signature Lines - Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '40px', marginTop: '60px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', marginBottom: '4px' }}></div>
              <span style={{ fontSize: '12px' }}>Accounts Officer</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', marginBottom: '4px' }}></div>
              <span style={{ fontSize: '12px' }}>Finance Manager</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', marginBottom: '4px' }}></div>
              <span style={{ fontSize: '12px' }}>C.E.O. Approval</span>
            </div>
          </div>

          {/* Signature Lines - Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', marginBottom: '4px' }}></div>
              <span style={{ fontSize: '12px' }}>Accountant</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', marginBottom: '4px' }}></div>
              <span style={{ fontSize: '12px' }}>Chief Oprat. Officer</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', marginBottom: '4px' }}></div>
              <span style={{ fontSize: '12px' }}>Received by</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankReciptVoucherView;
