import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getDataFundtion } from "../../../../Api/CRUDFunctions";
import { prepareSalaryVoucher, readSalaryExcel, uploadSalaryJournalVoucher } from "./uploadSalaryJv";

const money = (value) => Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });

const SalaryJvUpload = ({ onCreated }) => {
    const chartAccounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const navigate = useNavigate();
    const [buffer, setBuffer] = useState(null);
    const [employees, setEmployees] = useState({ ebfAccounts: [], loanAccounts: [] });
    const [voucher, setVoucher] = useState(null);
    const [summary, setSummary] = useState(null);
    const [fileName, setFileName] = useState("");
    const [missing, setMissing] = useState([]);
    const [unmatched, setUnmatched] = useState([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let live = true;
        const loadEmployees = async () => {
            try {
                const [ebf, loan] = await Promise.all([
                    getDataFundtion("/EmployeeEBFAccount"),
                    getDataFundtion("/EmployeeLoanAccount"),
                ]);
                if (!live) return;
                setEmployees({
                    ebfAccounts: ebf?.data || [],
                    loanAccounts: loan?.data || [],
                });
            } catch {
                toast.error("EBF aur loan accounts load nahi hue");
            }
        };
        loadEmployees();
        return () => {
            live = false;
        };
    }, []);

    useEffect(() => {
        if (!buffer) return;
        const parsed = readSalaryExcel(buffer, employees);
        const prepared = prepareSalaryVoucher(parsed, chartAccounts);
        setVoucher(parsed);
        setSummary(prepared);
        setMissing(prepared.missing);
        setUnmatched(prepared.unmatched);
    }, [buffer, employees, chartAccounts]);

    const onFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            setBuffer(await file.arrayBuffer());
            setFileName(file.name);
        } catch {
            setBuffer(null);
            setVoucher(null);
            setSummary(null);
            setFileName("");
            setMissing([]);
            setUnmatched([]);
            toast.error("Excel file read nahi hui");
        }
    };

    const onUpload = async () => {
        if (!voucher || busy) return;
        setBusy(true);
        try {
            const res = await uploadSalaryJournalVoucher({ voucher, chartAccounts });
            toast.success("Journal voucher upload ho gaya");
            onCreated?.();
            const id = res?.voucher?._id || res?._id;
            if (id) navigate(`/JournalVoucherView/${id}`);
        } catch (error) {
            if (error.missing) setMissing(error.missing);
            toast.error(error?.response?.data?.message || error.message || "Upload nahi hua");
        } finally {
            setBusy(false);
        }
    };

    const balanced = summary && summary.totalDebit === summary.totalCredit && summary.totalDebit > 0;
    const chartReady = Array.isArray(chartAccounts) && chartAccounts.length > 0;

    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
                <label className="inline-flex items-center text-sm font-medium px-5 py-2 rounded-md border-[1.5px] border-primary text-primary cursor-pointer">
                    Salary Excel
                    <input type="file" accept=".xls,.xlsx" className="hidden" onChange={onFile} />
                </label>
                <button
                    type="button"
                    onClick={onUpload}
                    disabled={!voucher || busy || !balanced || missing.length > 0 || !chartReady}
                    className="inline-flex items-center text-sm font-medium px-5 py-2 rounded-md bg-secondary text-on-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {busy ? "Uploading..." : "Upload JV"}
                </button>
            </div>
            {fileName ? <p className="text-xs pd-text-muted">{fileName}</p> : null}
            {summary && voucher ? (
                <p className="text-xs pd-text-muted text-right">
                    {voucher.Remarks} · {summary.lines.length} lines · Debit {money(summary.totalDebit)} · Credit {money(summary.totalCredit)}
                </p>
            ) : null}
            {fileName && !chartReady ? (
                <p className="text-xs text-error">Chart of accounts abhi load nahi hue</p>
            ) : null}
            {summary && !balanced ? (
                <p className="text-xs text-error">Debit aur credit barabar nahi hain</p>
            ) : null}
            {missing.length > 0 ? (
                <p className="text-xs text-error max-w-xl text-right">
                    Khate mein ye naam nahi mile: {missing.map((item) => item.name || item.code).join(", ")}
                </p>
            ) : null}
            {unmatched.length > 0 ? (
                <p className="text-xs pd-text-muted max-w-xl text-right">
                    A/C. CODE se employee account nahi mila ({unmatched.length}). In ki lines EBF ya Loan account par jayengi: {unmatched.join(", ")}
                </p>
            ) : null}
        </div>
    );
};

export default SalaryJvUpload;
