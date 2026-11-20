import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppSelect from '../../../Global/AppSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import { fetchVoucher } from '../../../../Redux/Reducers/VoucherReducer';
import { getDataFundtion, deleteDataFunction, createDataFunction } from '../../../../Api/CRUDFunctions';
import { fetchAllVoucherDependencies } from '../fetchVoucherDependencies';
import { employeeLineLabel, useEmployeeSubAccounts } from '../employeeSubAccounts';
import GlobalLoader from '../../../Global/GlobalLoader.jsx';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


import { formatAmount, amountToWords } from '../../../../utils/amountToWords.js';

const CashReciptVoucherView = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const dispatch = useDispatch();
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const employeeAccounts = useEmployeeSubAccounts();
    const Transport = useSelector((state) => state.Transport.Transport);
    const RegClient = useSelector((state) => state.Client.client);
    const Distributr = useSelector((state) => state.DistributroReducers.DistributroReducers)
    const Client = Distributr.concat(RegClient)
    const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher);
    const CashAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer);
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
    const store = useSelector((state) => state.Store.Store)
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const PostCashReceipt = UserRihts.find((item) => item == "Post Cash Receipt")
    const UnPostCashReceipt = UserRihts.find((item) => item == "UnPost Cash Receipt")
    const canEditCashReceipt = Array.isArray(UserRihts) && UserRihts.includes("Edit Cash Receipt")
    const [headerData, setHeaderData] = useState({
        VoucherDate: "",
        VoucherNumber: "",
        Remarks: "",
        Cheque: ""
    });
    const [tableData, setTableData] = useState([]);
    const [voucherData, setVoucherData] = useState(null);
    const [RecvFrom, setRecvFrom] = useState("Client");
    //console.log(RecvFrom, "RecvFrom")
    const [MainAccount, setMainAccount] = useState("");
    const [nextVoucherId, setNextVoucherId] = useState(null);
    const [prevVoucherId, setPrevVoucherId] = useState(null);
    const [printMode, setPrintMode] = useState(false);
    const [depsLoading, setDepsLoading] = useState(true);
    const [mergedEntities, setMergedEntities] = useState([]);

    

    // Helper to capitalize each word
    const toCapitalize = (str) => {
        if (!str) return '';
        return str.replace(/\b\w/g, char => char.toUpperCase());
    };

    // Helper functions to get display values
   const getAccountLabel = (accountId) => {
    // Redux
    const account = Account.find(a => String(a._id) === String(accountId));
    if (account) {
        return toCapitalize(`${account.AccountCode} ${account.AccountName}`);
    }

    // 🔥 API fallback
    const merged = mergedEntities?.find(
        a => String(a._id) === String(accountId) && a.type === "Account"
    );

    return merged ? toCapitalize(merged.AccountName) : '';
};

  const getClientLabel = (clientId) => {
    // Redux
    const allClients = [...Client, ...Distributr];
    
    const client = allClients.find(c => String(c._id) === String(clientId));
    if (client) {
        return toCapitalize(client.CutomerName || client.DistrbutorName || '');
    }

    // 🔥 API fallback
    const merged = mergedEntities?.find(
        c => String(c._id) === String(clientId)
    );

    if (!merged) return '';

    if (merged.type === "Client") {
        return toCapitalize(merged.CutomerName || '');
    }
    if (merged.type === "Vendor") {
        return toCapitalize(merged.VendorName || '');
    }
    if (merged.type === "Transporter") {
        return toCapitalize(merged.TransporterName || '');
    }

    return '';
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

    // Fetch dependencies on mount (handles page refresh)
    useEffect(() => {
        const loadAll = async () => {
            try {
                await fetchAllVoucherDependencies(dispatch);
                // Fetch vouchers if store is empty (handles page refresh)
                if (!EditVoucher || EditVoucher.length === 0) {
                    const data = await getDataFundtion("/Voucher?&VoucherType=CR");
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

    const getData = async () => {
    if (!id) return;

    const voucherData = EditVoucher.find((item) => String(item._id) === String(id));

    if (voucherData) {
        setMainAccount(voucherData.VoucherMainAccount);
        setTableData(voucherData.VoucharData);
        setHeaderData({
            VoucherDate: voucherData.VoucherDate.split("T")[0],
            VoucherNumber: voucherData.VoucherNumber,
            Remarks: voucherData.Remarks || "",
            Cheque: voucherData.Cheque || ""
        });
        setVoucherData(voucherData);

        if (voucherData.PaidFor == "Client") {
            setRecvFrom("Client");
        } else {
            setRecvFrom("other");
        }
    }

    try {
        const res = await getDataFundtion(`/Voucher/VoucherByID/${id}`);
        const voucher = res?.voucher || (!Array.isArray(res?.data) ? res?.data : null);

        if (!voucherData && voucher) {
            setMainAccount(voucher.VoucherMainAccount);
            setTableData(voucher.VoucharData || []);
            setHeaderData({
                VoucherDate: voucher.VoucherDate?.split("T")[0],
                VoucherNumber: voucher.VoucherNumber,
                Remarks: voucher.Remarks || "",
                Cheque: voucher.Cheque || ""
            });
            setVoucherData(voucher);

            if (voucher.PaidFor == "Client") {
                setRecvFrom("Client");
            } else {
                setRecvFrom("other");
            }
        }

        if (Array.isArray(res?.data)) {
            setMergedEntities(res.data);
        }
    } catch (err) {
        console.log(err);
    }
};

    useEffect(() => {
        getData();
    }, [id, EditVoucher]);

    // Calculate next/previous vouchers
    useEffect(() => {
        if (EditVoucher.length > 0 && id) {
            // Filter and sort CR vouchers by date (newest first) then by voucher number
            const crVouchers = EditVoucher.filter(v => v.VoucherType === "CR");
            const sortedVouchers = [...crVouchers].sort((a, b) => {
                const dateCompare = new Date(b.VoucherDate) - new Date(a.VoucherDate);
                if (dateCompare !== 0) return dateCompare;
                return b.VoucherNumber.localeCompare(a.VoucherNumber);
            });

            const currentIndex = sortedVouchers.findIndex(v => v._id === id);

            if (currentIndex > 0) {
                setNextVoucherId(sortedVouchers[currentIndex - 1]._id);
            } else {
                setNextVoucherId(null);
            }

            if (currentIndex < sortedVouchers.length - 1) {
                setPrevVoucherId(sortedVouchers[currentIndex + 1]._id);
            } else {
                setPrevVoucherId(null);
            }
        }
    }, [EditVoucher, id]);

    const lineStore = (row) => {
        const value = row?.store ?? row?.Store;
        return value === undefined || value === null || value === "" ? "" : value;
    };
    const mainAccountLine = tableData.find((row) => String(row.Account) === String(MainAccount));
    const mainAccountStoreId = lineStore(mainAccountLine) || lineStore(tableData.find((row) => lineStore(row)));
    const filteredData = tableData.filter(row => row.Account !== MainAccount);
    const mainAccountDebit = tableData
      .filter(row => row.Account === MainAccount)
      .reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
    const TotalDebit = filteredData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
    const TotalCredit = filteredData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);

    const handlePrintPDF = async () => {
        const input = document.getElementById("voucher-print-section");
        if (!input) return;
        const printContent = input.innerHTML;
        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <html>
            <head>
                <title>Cash Receipt Voucher</title>
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
    const nevigate = useNavigate()

    const handlePrintExcel = () => {
        const header = [
            ["Pearl Dynamic"],
            ["Cash Receipt Voucher"],
            [`Voucher Number: ${headerData.VoucherNumber}`],
            [`Voucher Date: ${headerData.VoucherDate}`],
            [`Remarks: ${headerData.Remarks}`],
            [`Ref: ${headerData.Cheque}`],
            [`Store: ${getStoreLabel(mainAccountStoreId)}`],
            [], // empty row
            ["Account", "Ref", "Slip", "Debit", "Credit", "Narration"],
        ];

        const rows = filteredData.map((row) => [
            employeeLineLabel(employeeAccounts, row) || getClientLabel(row.Client) || getTransporterLabel(row.Transporter) || getAccountLabel(row.Account),
            row.ClientRef2 || "",
            row.Slip || "",
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
        saveAs(new Blob([wbout], { type: "application/octet-stream" }), `CashReceiptVoucher_${headerData.VoucherNumber}.xlsx`);
    };

    const handlePrintWord = () => {
        const tableRows = filteredData.map((row) => `
                <tr>
                    <td>${employeeLineLabel(employeeAccounts, row) || getClientLabel(row.Client) || getTransporterLabel(row.Transporter) || getAccountLabel(row.Account)}</td>
                    <td>${row.ClientRef2 || ""}</td>
                    <td>${row.Slip || ""}</td>
                    <td>${row.Debit > 0 ? `(${row.Debit})` : 0}</td>
                    <td>${row.Credit || 0}</td>
                    <td>${row.Narration || ""}</td>
                </tr>`).join("");

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
                    <head>
                        <meta charset='utf-8'>
                        <title>Cash Receipt Voucher</title>
                        <style>
                            body { font-family: 'Times New Roman', serif; }
                            table { border-collapse: collapse; width: 100%; font-size: 14px; }
                            th, td { border: 1px solid #000; padding: 6px; text-align: left; }
                            h1, h2, p { text-align: center; margin: 0; }
                            .header-section { margin-bottom: 20px; }
                            .footer-section { margin-top: 40px; font-size: 13px; }
                        </style>
                    </head>
                    <body>
                        <div class="header-section">
                            <h1>Pearl Dynamic</h1>
                            <p>123 Business Street, Karachi | +92-300-0000000</p>
                            <h2>Cash Receipt Voucher</h2>
                        </div>

                        <table style="margin-bottom: 20px;">
                            <tr><td><strong>Voucher Number:</strong></td><td>${headerData.VoucherNumber}</td></tr>
                            <tr><td><strong>Voucher Date:</strong></td><td>${headerData.VoucherDate}</td></tr>
                            <tr><td><strong>Remarks:</strong></td><td>${headerData.Remarks}</td></tr>
                            <tr><td><strong>Ref:</strong></td><td>${headerData.Cheque}</td></tr>
                            <tr><td><strong>Main Account:</strong></td><td>${getAccountLabel(MainAccount)}</td></tr>
                            <tr><td><strong>Store:</strong></td><td>${getStoreLabel(mainAccountStoreId)}</td></tr>
                        </table>

                        <table>
                            <thead>
                                <tr>
                                    <th>${RecvFrom === "Client" ? "Client" : "Account"}</th>
                                    <th>Ref</th>
                                    <th>Slip</th>
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

                        <div class="footer-section">
                            <p>Prepared By: ____________________</p>
                            <p>Approved By: ____________________</p>
                            <p>Signature: ______________________</p>
                        </div>
                    </body>
                </html>
            `;

        const blob = new Blob(['\ufeff', content], {
            type: 'application/msword'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CashReceiptVoucher_${headerData.VoucherNumber}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleNextVoucher = () => {
        if (nextVoucherId) {
            navigate(`/CashReciptVoucherView/${nextVoucherId}`);
        }
    };

    const handlePrevVoucher = () => {
        if (prevVoucherId) {
            navigate(`/CashReciptVoucherView/${prevVoucherId}`);
        }
    };

    const handlePostUnpost = async (status) => {
        try {

            const woleData = { ...voucherData, status: status }
            //console.log(woleData)
            const res = await createDataFunction(`/Voucher/CustomerCashRecipt/${id}`, voucherData)
            toast.success("Status update")
            const updatedList = EditVoucher.map(item =>
                item._id === id
                    ? { ...item, status }
                    : item
            );

            dispatch(fetchVoucher(updatedList));
            setTimeout(() => {
                nevigate("/CashReciptVoucherList")
            }, 1000)
        } catch (err) {
            //console.log(err)
        }
    }


    const deleteVoucher = async () => {
        try {
            const res = await deleteDataFunction(`/Voucher/delete/${id}`);
            const data = await getDataFundtion("/Voucher?VoucherType=CR");
            dispatch(fetchVoucher(data.data));
            toast.success("Voucher Deleted Successfully");
            setTimeout(() => {
                handlePrevVoucher();
            }, 2000);
        } catch (err) {
            toast.error("Something Went Wrong");
        }
    };

     const getStoreLabel = (storeId) => {
  if (storeId === undefined || storeId === null || storeId === "") return "";
  if (String(storeId) === "0") return "Head Office";

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

    if (depsLoading) return <GlobalLoader loading={true} message="Loading Cash Receipt Voucher..." />;

    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Cash Receipt Voucher</h1>

            {/* Action buttons */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
                <button
                    onClick={() => navigate("/CashReciptVoucherList")}
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
                {canEditCashReceipt ? (
                    <button
                        className={`px-4 py-2 rounded transition pd-bg-muted0 text-yellow-50`}
                        onClick={() => navigate(`/CashReciptVoucherEdit/${id}`)}
                    >
                        Edit Voucher
                    </button>
                ) : null}
            
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
                        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>CASH RECEIPT VOUCHER</h2>
                    </div>

                    {/* Voucher Info Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 40px', fontSize: '13px', marginBottom: '20px' }}>
                        <div><strong>VOUCHER #</strong> &nbsp;: {headerData.VoucherNumber}</div>
                        <div><strong>VOUCHER DATE</strong> : {headerData.VoucherDate}</div>
                        <div><strong>ACCOUNT DEBITED</strong> &nbsp;: {getAccountLabel(MainAccount)}</div>
                        <div><strong>ACCOUNT CODE</strong> : {getAccountLabel(MainAccount)}</div>
                        <div><strong>STORE</strong> &nbsp;: {getStoreLabel(mainAccountStoreId)}</div>
                        <div><strong>RECEIVED FROM :</strong> &nbsp;: {headerData.PaidTo || RecvFrom}</div>
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
                                        {row.Slip || '-'} <br /> {row.ClientRef2 || ''}
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

export default CashReciptVoucherView;