import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { fetchVoucher } from '../../../../Redux/Reducers/VoucherReducer';
import { getDataFundtion, deleteDataFunction, updateDataFunction, createDataFunction } from '../../../../Api/CRUDFunctions';
import { fetchAllVoucherDependencies } from '../fetchVoucherDependencies';
import { employeeLineLabel, useEmployeeSubAccounts } from '../employeeSubAccounts';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import GlobalLoader from '../../../Global/GlobalLoader.jsx';



import { formatAmount, amountToWords } from '../../../../utils/amountToWords.js';

const JournalVoucherView = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const dispatch = useDispatch();
        const City = useSelector((state) => state.City.City)

    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const employeeAccounts = useEmployeeSubAccounts();
    const ebfAccounts = useSelector((state) => state.EmployeeSubAccountReducer?.groups?.EBF || []);
      const Client1 = useSelector((state) => state.Client.client)
        const Client = Client1.map((item) => ({
            ...item,
            DistrbutorName: item.DistrbutorName + ` (${City.find((c) => c._id === item.City)?.CityName || ''})`
        }));
    const Transport = useSelector((state) => state.Transport.Transport)
    const SoftStore = useSelector((state) => state.Store.Store)
    const store = [{
        _id: "0",
        StoreName: "Head Office",
        StoreCode: "HO"
    }].concat(SoftStore || []);
    const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher);
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
    const UserRihts = useSelector((state) => state.UsersRights.UserRights);
    const canEditJournal = Array.isArray(UserRihts) && UserRihts.includes("Edit Journal Voucher");
    const [depsLoading, setDepsLoading] = useState(true);
    const [voucherLoaded, setVoucherLoaded] = useState(false);
    const [headerData, setHeaderData] = useState({
        VoucherDate: "",
        VoucherNumber: "",
        Remarks: "",
        status: ""
    });
    const [tableData, setTableData] = useState([]);
    const [disabled, setdisabled] = useState(false);
    const [show, setShow] = useState(false);
    const [ref, setRef] = useState("");

    const [nextVoucherId, setNextVoucherId] = useState(null);
    const [prevVoucherId, setPrevVoucherId] = useState(null);
      const [mergedEntities, setMergedEntities] = useState([]);

    // Helper function to get account display label
  // Helper to capitalize each word
  const toCapitalize = (str) => {
    if (!str) return '';
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };

  const asEntityId = (val) => {
    if (!val) return "";
    if (typeof val === "object") return String(val._id || val.value || "");
    return String(val);
  };

  const getAccountLabel = (clientId, accountId, transporterId) => {
    const cId = asEntityId(clientId);
    const aId = asEntityId(accountId);
    const tId = asEntityId(transporterId);

    // ✅ Redux - Client
    const client = Client.find(c => String(c._id) === cId);
    if (client) {
        return toCapitalize(`${client.CutomerName || client.DistrbutorName} ${client.SalesFlowRef || client.OldCode || ""}`.trim());
    }

    // ✅ Redux - Transport (check before Account because Account will match TransporterPayable)
    if (tId) {
        const transporter = Transport.find(t => String(t._id) === tId);
        if (transporter) {
            return toCapitalize(`${transporter.OldCode ? transporter.OldCode + " " : ""}${transporter.TransporterName || ""} Transport`.trim());
        }
        const mergedTransport = mergedEntities?.find(
            e => String(e._id) === tId && (e.type === "Transporter" || e.TransporterName)
        );
        if (mergedTransport) {
            return toCapitalize(`${mergedTransport.OldCode ? mergedTransport.OldCode + " " : ""}${mergedTransport.TransporterName || ""} Transport`.trim());
        }
    }

    // ✅ Redux - Account
    const account = Account.find(a => String(a._id) === aId);
    if (account) {
        return toCapitalize(`${account.AccountCode} ${account.AccountName}`.trim());
    }

    // 🔥 Fallback - mergedEntities
    const merged = mergedEntities?.find(
        e => String(e._id) === cId || String(e._id) === aId || String(e._id) === tId
    );

    if (!merged) return "";

    if (merged.type === "Client") {
        return toCapitalize(`${merged.CutomerName || ""} ${merged.SalesFlowRef || merged.OldCode || ""}`.trim());
    }

    if (merged.type === "Vendor") {
        return toCapitalize(merged.VendorName || "");
    }

    if (merged.type === "Transporter" || merged.TransporterName) {
        return toCapitalize(`${merged.OldCode ? merged.OldCode + " " : ""}${merged.TransporterName || ""} Transport`.trim());
    }

    if (merged.type === "Account") {
        return toCapitalize(`${merged.AccountCode || ""} ${merged.AccountName || ""}`.trim());
    }

    return "";
};

    const getAccountCode = (clientId, accountId) => {
        const client = Client.find(c => String(c._id) === String(clientId));
        if (client) return "";

        const account = Account.find(a => String(a._id) === String(accountId));
        if (account) return account.AccountCode || "";

        const merged = mergedEntities?.find(
            e => String(e._id) === String(clientId) || String(e._id) === String(accountId)
        );
        if (merged?.type === "Account") return merged.AccountCode || "";

        return "";
    };

    const getEbfEmployeeCode = (row) => {
        const rawId = row?.EBF;
        const id = rawId && typeof rawId === "object" ? (rawId._id || rawId.value || "") : rawId;
        if (!id) return "";
        const account = ebfAccounts.find((item) => String(item._id) === String(id));
        const name = String(account?.name || "").trim();
        if (!name.toUpperCase().startsWith("EBF-")) return "";
        return String(account.AccountRef ?? account.accountRef ?? "").trim();
    };

    const getStoreLabel = (storeId) => {
        if (!storeId) return "";

        if (Array.isArray(store) && store.length) {
            const s = store.find((x) => String(x._id) === String(storeId));
            if (s) return toCapitalize(s.StoreName || "");
        }

        if (Array.isArray(mergedEntities) && mergedEntities.length) {
            const s = mergedEntities.find(
                (x) => String(x._id) === String(storeId) && x.type === "Store"
            );
            if (s) return toCapitalize(s.StoreName || "");
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
                    const data = await getDataFundtion("/Voucher?&VoucherType=JV");
                    dispatch(fetchVoucher(data.data || []));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setDepsLoading(false);
                setVoucherLoaded(true);
            }
        };
        loadAll();
    }, [dispatch]);

    // Fetch voucher data + entity labels (Transporter names)
useEffect(() => {

    const getData = async () => {
        if (!id) return;

        // ✅ Redux
        const voucherData = EditVoucher.find(item => String(item._id) === String(id));

        if (voucherData) {
            setTableData(voucherData.VoucharData || []);
            setHeaderData({
                VoucherDate: voucherData.VoucherDate?.split("T")[0],
                VoucherNumber: voucherData.VoucherNumber,
                Remarks: voucherData.Remarks || "",
                status: voucherData.status
            });
        }

        // Always load VoucherByID entities so Transporter names resolve
        try {
            const res = await getDataFundtion(`/Voucher/VoucherByID/${id}`);
            const voucher = res?.voucher || (!Array.isArray(res?.data) ? res?.data : null);

            if (!voucherData && voucher) {
                setTableData(voucher.VoucharData || []);
                setHeaderData({
                    VoucherDate: voucher.VoucherDate?.split("T")[0],
                    VoucherNumber: voucher.VoucherNumber,
                    Remarks: voucher.Remarks || "",
                    status: voucher.status
                });
            }

            if (Array.isArray(res?.data)) {
                setMergedEntities(res.data);
            }
        } catch (err) {
            console.log(err);
        }
    };

    getData();

}, [id, EditVoucher]);

    // Calculate next/previous vouchers
    useEffect(() => {
        if (EditVoucher.length > 0 && id) {
            const jvVouchers = EditVoucher.filter(v => v.VoucherType === "JV");
            const sortedVouchers = [...jvVouchers].sort((a, b) => {
                const dateCompare = new Date(b.VoucherDate) - new Date(a.VoucherDate);
                if (dateCompare !== 0) return dateCompare;
                return b.VoucherNumber.localeCompare(a.VoucherNumber);
            });

            const currentIndex = sortedVouchers.findIndex(v => v._id === id);

            setNextVoucherId(currentIndex > 0 ? sortedVouchers[currentIndex - 1]._id : null);
            setPrevVoucherId(currentIndex < sortedVouchers.length - 1 ? sortedVouchers[currentIndex + 1]._id : null);
        }
    }, [EditVoucher, id]);

    const TotalDebit = tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
    const TotalCredit = tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);

const handlePrintPDF = async () => {
    const input = document.getElementById("voucher-print-section");
    if (!input) return;
    const printContent = input.innerHTML;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
        <html>
        <head>
            <title>Journal Voucher</title>
            <style>
                @page { size: A4 portrait; margin: 10mm; }
                body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: #000; background: #fff; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 6px 8px; }
                @media print { body { padding: 0; margin: 0; } }
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

    const handlePrintExcel = () => {
        const header = [
            ["Pearl Dynamic"],
            ["Journal Voucher"],
            [`Voucher Number: ${headerData.VoucherNumber}`],
            [`Voucher Date: ${headerData.VoucherDate}`],
            [`Remarks: ${headerData.Remarks}`],
            [],
            ["Account", "Store", "Debit", "Credit", "Narration"],
        ];

        const rows = tableData.map((row) => [
            employeeLineLabel(employeeAccounts, row) || getAccountLabel(row.Client, row.Account, row.Transporter),
            getStoreLabel(row.store),
            Number(row.Debit || 0).toFixed(2) || 0,
            Number(row.Credit || 0).toFixed(2),
            row.Narration || "",
        ]);

        const totalRow = ["Total", "", TotalDebit, TotalCredit, ""];

        const data = [...header, ...rows, totalRow];
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Voucher");

        const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([wbout], { type: "application/octet-stream" }), `JournalVoucher_${headerData.VoucherNumber}.xlsx`);
    };

    const handlePrintWord = () => {
        const tableRows = tableData.map((row) => `
            <tr>
                <td>${employeeLineLabel(employeeAccounts, row) || getAccountLabel(row.Client, row.Account, row.Transporter)}</td>
                <td>${getStoreLabel(row.store)}</td>
                <td>${row.Debit || 0}</td>
                <td>${row.Credit || 0}</td>
                <td>${row.Narration || ""}</td>
            </tr>`).join("");

        const totalRow = `
            <tr>
                <td style="text-align:right;"><strong>Total:</strong></td>
                <td></td>
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
                    <title>Journal Voucher</title>
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
                        <p>123 Business Street, City | Phone: +000-000-0000</p>
                        <h2>Journal Voucher</h2>
                    </div>

                    <table style="margin-bottom: 20px;">
                        <tr><td><strong>Voucher Number:</strong></td><td>${headerData.VoucherNumber}</td></tr>
                        <tr><td><strong>Voucher Date:</strong></td><td>${headerData.VoucherDate}</td></tr>
                        <tr><td><strong>Remarks:</strong></td><td>${headerData.Remarks}</td></tr>
                    </table>

                    <table>
                        <thead>
                            <tr>
                                <th>Account</th>
                                <th>Store</th>
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
        link.download = `JournalVoucher_${headerData.VoucherNumber}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopyVoucher = () => {
        const confirmed = window.confirm("Do you want to copy this voucher to Add mode?");
        if (confirmed) {
            navigate(`/JournalVoucherAdd?copyFrom=${id}`);
        }
    };

    const handleNextVoucher = () => {
        if (nextVoucherId) navigate(`/JournalVoucherView/${nextVoucherId}`);
    };

    const handlePrevVoucher = () => {
        if (prevVoucherId) navigate(`/JournalVoucherView/${prevVoucherId}`);
    };



    const handlePost = async (Status) => {
        try {
            setdisabled(true)
            const res = await updateDataFunction(`/voucher/JvPost/${id}` , {status : Status})
            toast.success("Voucher Post")
            setTimeout(() => {
                navigate("/JournalVoucherList")
            }, 1500);
        } catch (err) {
            toast.error("Something went wrong")
        }
    }

    const handleUnPost = async (Status) => {
        try {
            setdisabled(true)
            const res = await updateDataFunction(`/voucher/JvUnPost/${id}` , {status : Status})
            toast.success("Voucher Post")
            setTimeout(() => {
                navigate("/JournalVoucherList")
            }, 1500);
        } catch (err) {
            toast.error("Something went wrong")
        }
    }
    if (depsLoading || !voucherLoaded) return <GlobalLoader loading={true} message="Loading Journal Voucher..." />;

    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Journal Voucher</h1>



            {/* Action buttons */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
                <button
                    onClick={() => navigate("/JournalVoucherList")}
                    className="pd-btn-outline text-sm md:text-base"
                >
                    Back
                </button>
                <button
                    onClick={handleCopyVoucher}
                    className="pd-btn-save text-sm md:text-base"
                >
                    Voucher Copy
                </button>
                {headerData.status !== "Post" ? 
                    <button
                        disabled={disabled}
                        onClick={() => handlePost("Post")}
                        className="pd-btn-save text-sm md:text-base"
                        >
                        Post
                    </button>
                    :
                    <button
                        disabled={disabled}
                        onClick={() => handleUnPost("UnPost")}
                        className="pd-btn-danger bg- text-sm md:text-base"
                        >
                        UnPost
                    </button>
                         }
                
                <button onClick={handlePrintPDF} className="pd-btn-danger px-4 py-2">
                    Print PDF
                </button>
                <button onClick={handlePrintExcel} className="pd-btn-success px-4 py-2 transition">
                    Print Excel
                </button>
                <button onClick={handlePrintWord} className="pd-btn-save transition">
                    Print Word
                </button>
                <button
                    onClick={handlePrevVoucher}
                    disabled={!prevVoucherId}
                    className={`px-4 py-2 rounded transition ${prevVoucherId ? 'pd-btn-nav' : 'pd-btn-nav pd-btn-nav--disabled'}`}
                >
                    Previous Voucher
                </button>
                <button
                    onClick={handleNextVoucher}
                    disabled={!nextVoucherId}
                    className={`px-4 py-2 rounded transition ${nextVoucherId ? 'pd-btn-nav' : 'pd-btn-nav pd-btn-nav--disabled'}`}
                >
                    Next Voucher
                </button>
                {canEditJournal ? (
                    <button
                        className="pd-btn-save"
                        onClick={() => navigate(`/JournalVoucherEdit/${id}`)}
                    >
                        Edit Voucher
                    </button>
                ) : null}

            </div>

            {/* Voucher display section */}
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
                        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>JOURNAL VOUCHER</h2>
                    </div>

                    {/* Voucher Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '20px' }}>
                        <div><strong>VOUCHER # :</strong> {headerData.VoucherNumber}</div>
                        <div><strong>VOUCHER DATE :</strong> {headerData.VoucherDate}</div>
                    </div>

                    {/* Data Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', width: '130px' }}>A/C. CODE</th>
                                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>ACCOUNT NAME</th>
                                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', width: '100px' }}>STORE</th>
                                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>DESCRIPTION</th>
                                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', width: '120px' }}>DEBIT</th>
                                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', width: '120px' }}>CREDIT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row, idx) => (
                                <tr key={idx}>
                                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>
                                        {getEbfEmployeeCode(row) || getAccountCode(row.Client, row.Account)}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                                        {employeeLineLabel(employeeAccounts, row) || getAccountLabel(row.Client, row.Account, row.Transporter)}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>
                                        {getStoreLabel(row.store)}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                                        {row.Narration || ''}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                                        {row.Debit > 0 ? formatAmount(row.Debit) : ''}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                                        {row.Credit > 0 ? formatAmount(row.Credit) : ''}
                                    </td>
                                </tr>
                            ))}
                            {tableData.length > 0 && (
                                <tr>
                                    <td colSpan="3" style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>TOTAL AMOUNT</td>
                                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatAmount(TotalDebit)}</td>
                                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatAmount(TotalCredit)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Amount in words */}
                    <div style={{ marginBottom: '40px', fontSize: '13px' }}>
                        <strong>AMOUNT IN WORDS:</strong> <span style={{ textDecoration: 'underline', marginLeft: '8px' }}>{amountToWords(TotalCredit)}</span>
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
                            <span style={{ fontSize: '12px' }}>Asst Finance Manager</span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ borderTop: '1px solid #000', marginBottom: '4px' }}></div>
                            <span style={{ fontSize: '12px' }}>Chief Oprat. Officer</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JournalVoucherView;