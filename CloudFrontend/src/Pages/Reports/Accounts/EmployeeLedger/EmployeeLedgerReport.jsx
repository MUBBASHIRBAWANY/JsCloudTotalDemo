import React, { useEffect, useState } from 'react';
import AppSelect from '../../../../Components/Global/AppSelect.jsx'
import { useSelector } from 'react-redux';
import EmployeeLedgerReportPopup from './EmployeeLedgerReportPopup';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { toast, ToastContainer } from 'react-toastify';
import ReportPageLayout from '../../../../Components/Global/ReportPageLayout.jsx';

const typeOptions = [
    { label: "All (EBF + Loan + Bad Debt)", value: "All" },
    { label: "EBF", value: "EBF" },
    { label: "Loan", value: "Loan" },
    { label: "Bad Debt", value: "BadDebt" },
];

const EmployeeLedgerReport = () => {
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [ledgerType, setLedgerType] = useState('All')
    const [quickSelect, setQuickSelect] = useState('Custom')
    const [years, setYears] = useState([])
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('')
    const [employeeOptions, setEmployeeOptions] = useState([])
    const [selectedEmployee, setSelectedEmployee] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    const quickSelectOptions = [
        { label: "Custom", value: "Custom" },
        { label: "Year to Date", value: "YearToDate" },
        { label: "Month to Date", value: "MonthToDate" }
    ];

    const currentYear = new Date().getFullYear();
    const monthOptions = [
        { label: "January", value: "01" },
        { label: "February", value: "02" },
        { label: "March", value: "03" },
        { label: "April", value: "04" },
        { label: "May", value: "05" },
        { label: "June", value: "06" },
        { label: "July", value: "07" },
        { label: "August", value: "08" },
        { label: "September", value: "09" },
        { label: "October", value: "10" },
        { label: "November", value: "11" },
        { label: "December", value: "12" }
    ];

    const handleQuickSelect = (value) => {
        setQuickSelect(value)
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        if (value === "MonthToDate") {
            const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
            setSelectedMonth(currentMonth);
            setStartDate(`${currentYear}-${currentMonth}-01`);
            setEndDate(todayStr)
        } else if (value === "YearToDate" && years.length) {
            const [start, end] = years.at(-1).label.split(" to ");
            setSelectedYear(years.at(-1).value)
            setStartDate(start)
            setEndDate(end)
        }
    }

    const handleYearChange = (year) => {
        setSelectedYear(year.value)
        const [start, end] = year.label.split(" to ");
        if (quickSelect === "YearToDate") {
            setStartDate(start)
            setEndDate(end)
        }
    }

    const handleMonthChange = (month) => {
        setSelectedMonth(month.value);
        const firstDay = `${currentYear}-${month.value}-01`;
        const lastDayDate = new Date(currentYear, parseInt(month.value, 10), 0);
        const lastDay = `${currentYear}-${month.value}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
        setStartDate(firstDay);
        setEndDate(lastDay);
    }

    useEffect(() => {
        const load = async () => {
            try {
                const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
                const yearList = (Array.isArray(yearRes) ? yearRes : yearRes?.data || []).map((item) => ({
                    label: `${item.DateStart} to ${item.DateEnd}`,
                    value: String(item.DateStart || "").split('-')[0]
                }));
                setYears(yearList)

                const [ebf, loan, bad] = await Promise.all([
                    getDataFundtion("/EmployeeEBFAccount"),
                    getDataFundtion("/EmployeeLoanAccount"),
                    getDataFundtion("/EmployeeBadDebtAccount"),
                ]);
                const mapAcc = (res, type) => (res?.data || []).map((item) => ({
                    label: `${item.name || ""} (${type})`,
                    value: String(item._id),
                    type,
                }));
                const all = [
                    ...mapAcc(ebf, "EBF"),
                    ...mapAcc(loan, "Loan"),
                    ...mapAcc(bad, "BadDebt"),
                ].sort((a, b) => a.label.localeCompare(b.label));
                setEmployeeOptions([{ label: "All Employees", value: "" }, ...all]);
            } catch (err) {
                console.error(err);
            }
        };
        load();
    }, []);

    const openPopupTab = () => {
        if (!startDate || !endDate) {
            return toast.error("Please enter start & end date");
        }
        setIsLoading(true);
        const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
        if (!popup) {
            setIsLoading(false);
            return alert('Popup blocked');
        }

        popup.document.title = 'Employee Ledger Report';
        popup.document.body.innerHTML = `<div id="popup-root"></div>`;
        const submitData = {
            startDate,
            endDate,
            type: ledgerType,
            employeeId: selectedEmployee?.value || "",
            employeeLabel: selectedEmployee?.label || "All Employees",
            PrintedBy: `${loginVendor?.firstname || ""} ${loginVendor?.lastname || ""}`.trim(),
        };
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<EmployeeLedgerReportPopup data={submitData} />);
                setIsLoading(false);
            }
        }, 100);
    };

    return (
        <ReportPageLayout title="Employee Ledger Report">
            <div className="pd-card p-6 w-[92%] max-w-xl mx-auto my-[4%]">
                <ToastContainer />
                <p className="text-sm text-slate-500 mb-4">
                    EBF, Loan aur Bad Debt ka employee-wise transaction ledger.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    {typeOptions.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setLedgerType(opt.value)}
                            className={`text-left rounded-xl border px-3 py-3 transition ${
                                ledgerType === opt.value
                                    ? "border-slate-800 bg-slate-900 text-white shadow"
                                    : "border-slate-200 bg-white hover:border-slate-400"
                            }`}
                        >
                            <div className="text-sm font-semibold">{opt.label}</div>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Quick Select</label>
                        <AppSelect
                            options={quickSelectOptions}
                            value={quickSelectOptions.find(opt => opt.value === quickSelect)}
                            onChange={(e) => handleQuickSelect(e.value)}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select..."
                        />
                    </div>

                    {quickSelect === "YearToDate" && (
                        <div>
                            <label className="block text-sm font-medium">Select Year</label>
                            <AppSelect
                                options={years}
                                value={years.find(y => y.value === selectedYear)}
                                onChange={(e) => handleYearChange(e)}
                                className="basic-single"
                                classNamePrefix="pd-select"
                                isSearchable
                                placeholder="Select Year..."
                            />
                        </div>
                    )}
                    {quickSelect === "MonthToDate" && (
                        <div>
                            <label className="block text-sm font-medium">Select Month</label>
                            <AppSelect
                                options={monthOptions}
                                value={monthOptions.find(m => m.value === selectedMonth)}
                                onChange={(e) => handleMonthChange(e)}
                                className="basic-single"
                                classNamePrefix="pd-select"
                                isSearchable
                                placeholder="Select Month..."
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium">Date From</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={`w-full mt-1 p-2 border rounded-md ${quickSelect !== "Custom" ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            disabled={quickSelect !== "Custom"}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Date To</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={`w-full mt-1 p-2 border rounded-md ${quickSelect !== "Custom" ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            disabled={quickSelect !== "Custom"}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Employee (optional)</label>
                        <AppSelect
                            options={employeeOptions}
                            value={selectedEmployee || employeeOptions[0] || null}
                            onChange={(e) => setSelectedEmployee(e)}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            isClearable
                            placeholder="All Employees"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <button
                            onClick={openPopupTab}
                            disabled={isLoading}
                            className={`pd-btn-save w-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'Processing...' : 'Open Ledger'}
                        </button>
                    </div>
                </div>
            </div>
        </ReportPageLayout>
    );
};

export default EmployeeLedgerReport;
