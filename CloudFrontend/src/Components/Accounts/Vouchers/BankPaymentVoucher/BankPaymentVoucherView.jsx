import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppSelect from '../../../Global/AppSelect.jsx'
import { createDataFunction, deleteDataFunction, getDataFundtion, updateDataFunction } from '../../../../Api/CRUDFunctions';
import { toast, ToastContainer } from 'react-toastify';
import { fetchVoucher } from '../../../../Redux/Reducers/VoucherReducer';
import { fetchChqBook } from '../../../../Redux/Reducers/ChqBookReducer';
import { fetchAllVoucherDependencies } from '../fetchVoucherDependencies';
import { employeeLineLabel, useEmployeeSubAccounts } from '../employeeSubAccounts';
import GlobalLoader from '../../../Global/GlobalLoader.jsx';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


import { logTransaction } from '../logTransaction';
import { formatAmount } from '../../../../utils/amountToWords.js';
import { amountToWords } from '../../../../utils/amountToWords.js';
const BankPaymentVoucherView = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const employeeAccounts = useEmployeeSubAccounts();
    const Vendor = useSelector((state) => state.Vendor.state);
    const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher);
    const ChqBook = useSelector((state) => state.ChqBook.ChqBook)
    const BankAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer);
    const [unUsedChq, setUnuseChq] = useState([])
    const [chq, setChq] = useState('')
    const [printMode, setPrintMode] = useState(false);
    const [depsLoading, setDepsLoading] = useState(true);
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
    const UserRihts = useSelector((state) => state.UsersRights.UserRights);
    const canEditBankPayment = Array.isArray(UserRihts) && UserRihts.includes("Edit Bank Payment");
    const Transport = useSelector((state) => state.Transport.Transport);
    const Client1 = useSelector((state) => state.Client.client);
    const City = useSelector((state) => state.City.City);
    const Client = (Client1 || []).map((item) => ({
        ...item,
        DistrbutorName: item.DistrbutorName + ` (${City.find((c) => c._id === item.City)?.CityName || ''})`
    }));


    const store = [{
        _id: "0",
        StoreName: "Head Office",
        StoreCode: "HO"
    }].concat(useSelector((state) => state.Store.Store));
    const [mergedEntities, setMergedEntities] = useState([]);

    const [MainAccount, setMainAccount] = useState("");
    const [tableData, setTableData] = useState([]);
    const [PaidFor, setPaidFor] = useState("vendor");
    const [index, setIndex] = useState("")
    const [headerData, setHeaderData] = useState({
        VoucherDate: "",
        VoucherNumber: "",
        ChequeNumber: "",
        PaidTo: ""
    });

    const dispatch = useDispatch()

    const SetDrp = (val, ps) => {
        setMainAccount(val)
        setUnuseChq([])
        ps === undefined ? setChq('') : null
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

    // Fetch dependencies on mount (handles page refresh)
    useEffect(() => {
        const loadAll = async () => {
            try {
                await fetchAllVoucherDependencies(dispatch);
                // Fetch vouchers if store is empty (handles page refresh)
                if (!EditVoucher || EditVoucher.length === 0) {
                    const data = await getDataFundtion("/Voucher?&VoucherType=BP");
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

        // 1️⃣ Redux se try
        const voucherData = EditVoucher.find((item) => String(item._id) === String(id));
        const index = EditVoucher.findIndex((item) => String(item._id) === String(id));
        setIndex(index);

        if (voucherData) {
            // ✅ Redux hit
            setMainAccount(voucherData.VoucherMainAccount);
            setTableData(voucherData.VoucharData || []);
            setPaidFor(voucherData.PaidFor);

            SetDrp(voucherData.VoucherMainAccount, 1);

            setHeaderData({
                VoucherDate: voucherData.VoucherDate?.split("T")[0],
                VoucherNumber: voucherData.VoucherNumber,
                ChequeNumber: voucherData.ChequeNumber,
                PaidTo: voucherData.PaidTo,
            });
        }

        // Always load entities so Transporter names resolve
        try {
            const res = await getDataFundtion(`/Voucher/VoucherByID/${id}`);
            const voucher = res?.voucher || (!Array.isArray(res?.data) ? res?.data : null);

            if (!voucherData && voucher) {
                setMainAccount(voucher.VoucherMainAccount);
                setTableData(voucher.VoucharData || []);
                setPaidFor(voucher.PaidFor);

                setHeaderData({
                    VoucherDate: voucher.VoucherDate?.split("T")[0],
                    VoucherNumber: voucher.VoucherNumber,
                    ChequeNumber: voucher.ChequeNumber,
                    PaidTo: voucher.PaidTo,
                });

                if (voucher.VoucherMainAccount) {
                    SetDrp(voucher.VoucherMainAccount, 1);
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

    // Helper to capitalize each word
    const toCapitalize = (str) => {
        if (!str) return '';
        return str.replace(/\b\w/g, char => char.toUpperCase());
    };

    // Helper functions to get display values
    const getAccountLabel = (accountId) => {
        if (!accountId) return "";

        // Redux
        if (Account?.length) {
            const acc = Account.find(a => String(a._id) === String(accountId));
            if (acc) return toCapitalize(`${acc.AccountCode} ${acc.AccountName}`);
        }

        // API fallback
        if (mergedEntities?.length) {
            const acc = mergedEntities.find(
                a => String(a._id) === String(accountId) && a.type === "Account"
            );
            if (acc) return toCapitalize(acc.AccountName);
        }

        return "Unknown Account";
    };
    const getVendorLabel = (vendorId) => {
        if (!vendorId) return "";

        if (Vendor?.length) {
            const vendor = Vendor.find(v => String(v._id) === String(vendorId));
            if (vendor) return toCapitalize(vendor.VendorName);
        }

        if (mergedEntities?.length) {
            const v = mergedEntities.find(
                x => String(x._id) === String(vendorId) && x.type === "Vendor"
            );
            if (v) return toCapitalize(v.VendorName);
        }

        return "Unknown Vendor";
    };

    const getAccountCode = (accountId) => {
        if (!accountId) return "";
        if (Account?.length) {
            const acc = Account.find(a => String(a._id) === String(accountId));
            if (acc) return acc.AccountCode || "";
        }
        if (mergedEntities?.length) {
            const acc = mergedEntities.find(a => String(a._id) === String(accountId) && a.type === "Account");
            if (acc) return acc.AccountCode || "";
        }
        return "";
    };

    const getStoreLabel = (storeId) => {
        if (!storeId) return "";

        if (store?.length) {
            const s = store.find(x => String(x._id) === String(storeId));
            if (s) return toCapitalize(s.StoreName);
        }

        if (mergedEntities?.length) {
            const s = mergedEntities.find(
                x => String(x._id) === String(storeId) && x.type === "Store"
            );
            if (s) return toCapitalize(s.StoreName);
        }

        return "Unknown Store";
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

    const getClientLabel = (clientId) => {
        if (!clientId) return "";
        if (Array.isArray(Client) && Client.length) {
            const c = Client.find((x) => String(x._id) === String(clientId));
            if (c) return toCapitalize((c.AccountCode || c.SalesFlowRef || c.OldCode || "") + " " + (c.CutomerName || c.DistrbutorName || ""));
        }
        return "";
    };

    const filteredData = tableData.filter(row => row.Account !== MainAccount);
    const mainAccountCredit = tableData
        .filter(row => row.Account === MainAccount)
        .reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);
    const TotalDebit = filteredData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
    const TotalCredit = filteredData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);
    const [nextVoucherId, setNextVoucherId] = useState(null);
    const [prevVoucherId, setPrevVoucherId] = useState(null);

    // Calculate next/previous vouchers
    useEffect(() => {
        if (EditVoucher.length > 0 && id) {
            // Sort vouchers by date (newest first) then by voucher number
            const sortedVouchers = [...EditVoucher].sort((a, b) => {
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

    // Button handlers
    const handlePrintVoucherCopy = () => {
        const confirmed = window.confirm("Do you want to copy this voucher to Add mode?");
        if (confirmed) {
            navigate(`/BankPaymentVoucherAdd?copyFrom=${id}`);
        }
    };
const handlePrintPDF = async () => {
    const input = document.getElementById("voucher-print-section");
    if (!input) return;
    const printContent = input.innerHTML;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
        <html>
        <head>
            <title>Bank Payment Voucher</title>
            <style>
                @page { 
                    size: A4 portrait; 
                    margin: 5mm;  /* ← Reduced from 10mm to 5mm */
                }
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 0; 
                    margin: 0; 
                    color: #000; 
                    background: #fff;
                    font-size: 11px;  /* ← Smaller base font */
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse;
                    font-size: 10px;  /* ← Smaller table font */
                }
                th, td { 
                    border: 1px solid #000; 
                    padding: 2px 4px;  /* ← Reduced padding */
                    font-size: 10px;
                }
                h1 { font-size: 16px; margin: 2px 0; }
                h2 { font-size: 13px; margin: 2px 0; }
                @media print { 
                    body { padding: 0; margin: 0; } 
                }
            </style>
        </head>
        <body>
            ${printContent}
            <div style="margin-top:15px;font-size:8px;text-align:center;color:#555;border-top:1px solid #ccc;padding-top:4px;">
                Developed by JS International | Website: https://jaffersons.com/ | Contact: 0301-8251291
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
};

    const handlePrintExcel = () => {
        const header = [
            ["Pearl Dynamic"],
            ["Bank Payment Voucher"],
            [`Voucher Number: ${headerData.VoucherNumber}`],
            [`Voucher Date: ${headerData.VoucherDate}`],
            [`Paid To: ${headerData.PaidTo}`],
            [`Cheque Number: ${headerData.ChequeNumber}`],
            [], // empty row
            ["A/C Code", "Account", "Department", "Ref", "Debit", "Credit", "Narration"],
        ];

        const rows = filteredData.map((row) => [
            getAccountCode(row.Account),
            employeeLineLabel(employeeAccounts, row) || getClientLabel(row.Client) || getTransporterLabel(row.Transporter) || getVendorLabel(row.vendor) || getAccountLabel(row.Account),
            getStoreLabel(row.store),
            row.Ref || "",
            row.Debit || 0,
            row.Credit || 0,
            row.Narration || "",
        ]);

        const totalRow = ["", "", "", "Total", mainAccountCredit, "", ""];

        const data = [...header, ...rows, totalRow];

        const worksheet = XLSX.utils.aoa_to_sheet(data); // this is key
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Voucher");

        const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([wbout], { type: "application/octet-stream" }), `Voucher_${headerData.VoucherNumber}.xlsx`);

    };

    const handlePrintWord = () => {
        const tableRows = filteredData.map((row) => `
    <tr>
      <td>${getAccountCode(row.Account)}</td>
      <td>${employeeLineLabel(employeeAccounts, row) || getClientLabel(row.Client) || getTransporterLabel(row.Transporter) || getVendorLabel(row.vendor) || getAccountLabel(row.Account)}</td>
      <td>${getStoreLabel(row.store)}</td>
      <td>${row.Ref || ""}</td>
      <td>${row.Debit || 0}</td>
      <td>${row.Credit || 0}</td>
      <td>${row.Narration || ""}</td>
    </tr>`).join("");

        const totalRow = `
    <tr>
      <td colspan="4" style="text-align:right;"><strong>Total:</strong></td>
      <td><strong>${TotalDebit}</strong></td>
      <td><strong>${TotalCredit}</strong></td>
      <td></td>
    </tr>`;

        const content = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' 
        xmlns:w='urn:schemas-microsoft-com:office:word' 
        xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Voucher</title>
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
        <h2>Bank Payment Voucher</h2>
      </div>

      <table style="margin-bottom: 20px;">
        <tr><td><strong>Voucher Number:</strong></td><td>${headerData.VoucherNumber}</td></tr>
        <tr><td><strong>Voucher Date:</strong></td><td>${headerData.VoucherDate}</td></tr>
        <tr><td><strong>Paid To:</strong></td><td>${headerData.PaidTo}</td></tr>
        <tr><td><strong>Cheque Number:</strong></td><td>${headerData.ChequeNumber}</td></tr>
        <tr><td><strong>Main Account:</strong></td><td>${getAccountLabel(MainAccount)}</td></tr>
      </table>

      <table>
        <thead>
          <tr>
            <th>A/C Code</th>
            <th>${PaidFor === "vendor" ? "Vendor" : "Account"}</th>
            <th>Department</th>
            <th>Ref</th>
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
        link.download = `Voucher_${headerData.VoucherNumber}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const handleNextVoucher = () => {
        if (nextVoucherId) {
            navigate(`/bankpaymentvoucherview/${nextVoucherId}`);
        }
    };

    const handlePrevVoucher = () => {
        if (prevVoucherId) {
            navigate(`/bankpaymentvoucherview/${prevVoucherId}`);
        }
    };


    const deleteVoucher = async () => {
        try {
            const res = await deleteDataFunction(`/Voucher/delete/${id}`);
            const data = await getDataFundtion("/Voucher?VoucherType=BP")
            dispatch(fetchVoucher(data.data))
            toast.success("Voucher Delete Successfully")
            setTimeout(() => {
                handlePrevVoucher()
            }, 2000)
        } catch (err) {
            toast.error("Something went wrong")
        }
    }

    if (depsLoading) return <GlobalLoader loading={true} message="Loading Bank Payment Voucher..." />;

    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Bank Payment Voucher</h1>

            {/* Add button container */}

            <div className="flex flex-wrap justify-center gap-2 mb-4">
                <button
                    onClick={() => navigate("/BankPaymentVoucherList")}
                    className="pd-btn-outline text-sm md:text-base"
                >
                    Back
                </button>
                <button
                    onClick={handlePrintVoucherCopy}
                    className="pd-btn-save"
                >
                    Voucher Copy
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
                {canEditBankPayment ? (
                    <button
                        className={`px-4 py-2 rounded transition pd-bg-muted0 text-yellow-50`}
                        onClick={() => navigate(`/BankPaymentVoucherEdit/${id}`)}
                    >
                        Edit Voucher
                    </button>
                ) : null}
                <button
                    className={`px-4 py-2 rounded transition bg-red-500 text-yellow-50`}
                    onClick={() => deleteVoucher()}
                >
                    Delete Voucher

                </button>
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
                        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>BANK PAYMENT VOUCHER</h2>
                    </div>

                    {/* Voucher Info Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 40px', fontSize: '13px', marginBottom: '20px' }}>
                        <div><strong>VOUCHER #</strong> &nbsp;: {headerData.VoucherNumber}</div>
                        <div><strong>VOUCHER DATE</strong> : {headerData.VoucherDate}</div>
                        <div><strong>ACCOUNT CREDITED</strong> &nbsp;: {getAccountLabel(MainAccount)}</div>
                        <div><strong>ACCOUNT CODE</strong> : {getAccountCode(MainAccount)}</div>
                        <div><strong>PAID TO :</strong> &nbsp;: {headerData.PaidTo}</div>
                        <div></div>
                    </div>

                    {/* Data Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px', marginBottom: '16px' }}>
                        <thead>
                            <tr>
                                <th style={{
                                    border: '1px solid #000',
                                    padding: '3px 4px',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    width: '70px'
                                }}>CHQ DT. /<br />CHQ NO.</th>

                                <th style={{
                                    border: '1px solid #000',
                                    padding: '3px 8px',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    width: '70px'
                                }}>A/C. CODE</th>

                                <th style={{
                                    border: '1px solid #000',
                                    padding: '3px 8px',
                                    textAlign: 'center',
                                    fontWeight: 'bold'
                                }}>ACCOUNT NAME</th>

                                <th style={{
                                    border: '1px solid #000',
                                    padding: '3px 8px',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    width: '80px'
                                }}>DEPARTMENT</th>

                                <th style={{
                                    border: '1px solid #000',
                                    padding: '6px 8px',
                                    textAlign: 'center',
                                    fontWeight: 'bold'
                                }}>COMMENTS</th>

                                <th style={{
                                    border: '1px solid #000',
                                    padding: '3px 8px',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    width: '80px'
                                }}>AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((row, idx) => (
                                <tr key={idx}>
                                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', verticalAlign: 'top' }}>
                                        {headerData.VoucherDate}<br />{headerData.ChequeNumber} <br /> {row.Ref || ''}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center' }}>
                                        {getAccountCode(row.Account)}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '3px 4px' }}>
                                        {employeeLineLabel(employeeAccounts, row) || getClientLabel(row.Client) || getTransporterLabel(row.Transporter) || getVendorLabel(row.vendor) || getAccountLabel(row.Account)}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '1px 2px' }}>
                                        {getStoreLabel(row.store)}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                                        {row.Narration || ''}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                                        {row.Credit > 0 ? `(${formatAmount(row.Credit)})` : formatAmount(row.Debit)}
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length > 0 && (
                                <tr>
                                    <td colSpan="5" style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>TOTAL AMOUNT</td>
                                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatAmount(mainAccountCredit)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Amount in words */}
                    <div style={{ marginBottom: '40px', fontSize: '13px' }}>
                        <strong>AMOUNT IN WORDS:</strong> <span style={{ textDecoration: 'underline', marginLeft: '8px' }}>{amountToWords(mainAccountCredit)}</span>
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
    )
}

export default BankPaymentVoucherView;
