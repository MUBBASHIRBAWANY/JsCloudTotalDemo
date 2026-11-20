import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppSelect from '../../../Global/AppSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import { fetchVoucher } from '../../../../Redux/Reducers/VoucherReducer';
import { getDataFundtion, deleteDataFunction, createDataFunction } from '../../../../Api/CRUDFunctions';
import { fetchAllVoucherDependencies } from '../fetchVoucherDependencies';
import { employeeLineLabel, useEmployeeSubAccounts } from '../employeeSubAccounts';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


import { formatAmount, amountToWords } from '../../../../utils/amountToWords.js';
import { canEditVoucherType, getVoucherEditPath } from '../voucherEditAccess.js';

const AllVoucherView = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const dispatch = useDispatch();
    const employeeAccounts = useEmployeeSubAccounts();
    const [Account , setAccount ] = useState([]);
    const [Client , setClient] = useState([])
    const [Transport, setTransport] = useState([])
    const EditVoucher = useSelector((state) => state.VoucherReducer.Voucher);
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
    const CashAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer);
    const [VoucherType , setVoucherType] = useState("")
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const canEditThisVoucher = canEditVoucherType(UserRihts, VoucherType)
    const PostCashReceipt = UserRihts.find((item) => item == "Post Cash Receipt")
    const UnPostCashReceipt = UserRihts.find((item) => item == "UnPost Cash Receipt")
    const PostBankReceipt = UserRihts.find((item) => item == "Post Bank Receipt")
    const UnPostBankReceipt = UserRihts.find((item) => item == "UnPost Bank Receipt")
    const PostCashPayment = UserRihts.find((item) => item == "Post Cash Payment")
    const UnPostCashPayment = UserRihts.find((item) => item == "UnPost Cash Payment")
    const PostBankPayment = UserRihts.find((item) => item == "Post Bank Payment")
    const UnPostBankPayment = UserRihts.find((item) => item == "UnPost Bank Payment")
    const PostJournalVoucher = UserRihts.find((item) => item == "Post Journal Voucher")
    const UnPostJournalVoucher = UserRihts.find((item) => item == "UnPost Journal Voucher")
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

    // Helper to capitalize each word
    const toCapitalize = (str) => {
        if (!str) return '';
        return str.replace(/\b\w/g, char => char.toUpperCase());
    };

    // Helper functions to get display values
    const getAccountLabel = (accountId) => {
        const account = Account.find(a => String(a._id) === String(accountId));
        return account ? toCapitalize(`${account.AccountCode} ${account.AccountName}`) : '';
    };

    const getClientLabel = (clientId) => {
        const client = Client.find(c => String(c._id) === String(clientId));
        return client ? toCapitalize(client.CutomerName || client.DistrbutorName || '') : '';
    };

    const getTransporterLabel = (transporterId) => {
        if (!transporterId) return '';
        const tId = typeof transporterId === 'object'
            ? String(transporterId._id || transporterId.value || '')
            : String(transporterId);
        const t = Transport.find((x) => String(x._id) === tId);
        if (!t) return '';
        return toCapitalize((t.OldCode ? t.OldCode + ' ' : '') + (t.TransporterName || '') + ' Transport');
    };

    const getData = async () => {
        const voucher = await getDataFundtion(`/Voucher/getVoucherByNumber/${id}`)
        const voucherData = voucher.data
        setClient(voucher.Client || [])
        setAccount(voucher.Accounts || [])
        setTransport(voucher.Transporters || [])
        setVoucherType(voucher.data.VoucherType)
        //console.log(voucher)
        if (voucherData) {
            setMainAccount(voucherData.VoucherMainAccount);
            setTableData(voucherData.VoucharData);
            setHeaderData({
                VoucherDate: voucherData.VoucherDate.split("T")[0],
                VoucherNumber: voucherData.VoucherNumber,
                Remarks: voucherData.Remarks || "",
                Cheque: voucherData.Cheque || ""
            });
            setVoucherData(voucherData)
            // Determine RecvFrom based on data
            if (voucherData.PaidFor == "Client") {
                setRecvFrom("Client");
            } else {
                setRecvFrom("other");
            }
        }
    };

    useEffect(() => {
        fetchAllVoucherDependencies(dispatch).catch(() => {});
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
                <title>Voucher</title>
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
            [], // empty row
            ["Account", "Ref", "Slip", "Debit", "Credit", "Narration"],
        ];

        const rows = tableData.map((row) => [
            employeeLineLabel(employeeAccounts, row) || getClientLabel(row.Client) || getTransporterLabel(row.Transporter) || getAccountLabel(row.Account),
            row.ClientRef2 || "",
            row.Slip || "",
            row.Debit || 0,
            row.Credit || 0,
            row.Narration || "",
        ]);

        const totalRow = ["", "", "Total", TotalDebit, TotalCredit, ""];

        const data = [...header, ...rows, totalRow];

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Voucher");

        const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([wbout], { type: "application/octet-stream" }), `CashReceiptVoucher_${headerData.VoucherNumber}.xlsx`);
    };

    const handlePrintWord = () => {
        const tableRows = tableData.map((row) => `
                <tr>
                    <td>${employeeLineLabel(employeeAccounts, row) || getClientLabel(row.Client) || getTransporterLabel(row.Transporter) || getAccountLabel(row.Account)}</td>
                    <td>${row.ClientRef2 || ""}</td>
                    <td>${row.Slip || ""}</td>
                    <td>${row.Debit || 0}</td>
                    <td>${row.Credit || 0}</td>
                    <td>${row.Narration || ""}</td>
                </tr>`).join("");

        const totalRow = `
                <tr>
                    <td colspan="3" style="text-align:right;"><strong>Total:</strong></td>
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
            navigate(`/AllVoucherView/${nextVoucherId}`);
        }
    };

    const handlePrevVoucher = () => {
        if (prevVoucherId) {
            navigate(`/AllVoucherView/${prevVoucherId}`);
        }
    };

    const handlePostUnpost = async (status) => {
        try {
            
            const woleData = {...voucherData, status : status }
            //console.log(woleData)
            const res = await createDataFunction(`/Voucher/CustomerCashRecipt/${id}`, voucherData)
            toast.success(res)
            setTimeout(() => {
                nevigate("/BankReciptVoucher")
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

    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">{VoucherType === "CR" ? <>Cash Receipt Voucher</> :
             VoucherType === "BR" ? <>Bank Receipt Voucher</> : VoucherType === "BP" ? <>Bank Payment Voucher</> : VoucherType === "CP" ? <>Cash Payment Voucher</> : <>Journal Voucher</>
             }</h1>

            {/* Action buttons */}
            <div className="flex flex-wrap jus4">
                <button
                    onClick={() => navigate("/CashReciptVoucherList")}
                    className="pd-btn-outline text-sm md:text-base"
                >
                    Back
                </button>
                {voucherData?.status !== "Post" && (
                    (VoucherType === "CR" && PostCashReceipt) ||
                    (VoucherType === "BR" && PostBankReceipt) ||
                    (VoucherType === "CP" && PostCashPayment) ||
                    (VoucherType === "BP" && PostBankPayment) ||
                    (VoucherType === "JV" && PostJournalVoucher)
                ) ? <button onClick={() => handlePostUnpost("post")} className="pd-btn-save">Post</button> : null}
                {voucherData?.status == "Post" && (
                    (VoucherType === "CR" && UnPostCashReceipt) ||
                    (VoucherType === "BR" && UnPostBankReceipt) ||
                    (VoucherType === "CP" && UnPostCashPayment) ||
                    (VoucherType === "BP" && UnPostBankPayment) ||
                    (VoucherType === "JV" && UnPostJournalVoucher)
                ) ? <button onClick={() => handlePostUnpost("Unpost")} className="px-4 py-2 bg-yellow-600 text-white rounded">Un Post</button> : null}
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
                {canEditThisVoucher && voucherData?._id ? (
                    <button
                        className="pd-btn-save"
                        onClick={() => {
                            const path = getVoucherEditPath(VoucherType, voucherData._id);
                            if (path) navigate(path);
                            else toast.error("Edit page not found for this voucher type");
                        }}
                    >
                        Edit Voucher
                    </button>
                ) : null}
                <button
                    className="pd-btn-danger px-4 py-2"
                    onClick={() => deleteVoucher()}
                >
                    Delete Voucher
                </button>
            </div>

            {/* Voucher display section */}
            <div className="pd-card p-4 md:p-6">
                <div id="voucher-print-section" className="p-6 border pd-border-default border pd-bg-surface text-black">
                    <div className="text-center mb-4">
                        <h1 className="text-2xl font-bold">Pearl Dynamic</h1>
                        <p className="text-sm">123 Business Road, City, Country | +92-XXX-XXXXXXX</p>
                        <h2 className="text-xl font-bold mt-4 underline">Cash Receipt Voucher</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div><strong>Voucher Date:</strong> {headerData.VoucherDate}</div>
                        <div><strong>Voucher Number:</strong> {headerData.VoucherNumber}</div>
                        <div><strong>Remarks:</strong> {headerData.Remarks}</div>
                        <div><strong>Ref:</strong> {headerData.Cheque}</div>
                        <div><strong>Account:</strong> {getAccountLabel(MainAccount)}</div>
                        <div><strong>Received From:</strong> {RecvFrom}</div>
                    </div>

                    <div className="overflow-x-auto mb-6">
                        <table className="w-full border-collapse text-sm md:text-base">
                            <thead>
                                <tr className="pd-bg-muted">
                                    <th className="border p-2 min-w-[200px]">{RecvFrom === "Client" ? "Client" : "Account"}</th>
                                    {RecvFrom === "Client" && <th className="border p-2" style={{ width: "8vw" }}>Ref</th>}
                                    <th className="border p-2" style={{ width: "5vw" }}>Slip</th>
                                    <th className="border p-2" style={{ width: "5vw" }}>Debit</th>
                                    <th className="border p-2" style={{ width: "5vw" }}>Credit</th>
                                    <th className="border p-2">Narration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map((row, index) => (
                                    <tr key={index} className="hover:pd-bg-muted">
                                        <td className="border p-2">
                                            {employeeLineLabel(employeeAccounts, row) || getClientLabel(row.Client) || getTransporterLabel(row.Transporter) || getAccountLabel(row.Account)}
                                        </td>
                                        {RecvFrom === "Client" && (
                                            <td className="border p-2">
                                                {row.ClientRef2 || ''}
                                            </td>
                                        )}
                                        <td className="border p-2">
                                            {row.Slip || ''}
                                        </td>
                                        <td className="border p-2">
                                            {row.Debit}
                                        </td>
                                        <td className="border p-2">
                                            {row.Credit}
                                        </td>
                                        <td className="border p-2">
                                            {row.Narration || ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {tableData.length !== 0 && (
                                <tfoot>
                                    <tr className="pd-table-footer">
                                        <td className="border p-2" colSpan={RecvFrom === "Client" ? 3 : 2}></td>
                                        <td className="border p-2 text-right">Total:</td>
                                        <td className="border p-2">{TotalDebit}</td>
                                        <td className="border p-2">{TotalCredit}</td>
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

                    <div className="mt-10 grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <p>Prepared By: ___________________</p>
                        </div>
                        <div>
                            <p>Approved By: ___________________</p>
                        </div>
                        <div>
                            <p>Signature: ___________________</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AllVoucherView;