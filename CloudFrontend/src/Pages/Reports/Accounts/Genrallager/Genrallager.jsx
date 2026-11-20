// Genrallager.jsx
import React, { useEffect, useState } from 'react';
import AppSelect from '../../../../Components/Global/AppSelect.jsx'
import { useSelector } from 'react-redux';
import GenrallagerPopup from './GenrallagerPopup';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { toast, ToastContainer } from 'react-toastify';
import ReportPageLayout from '../../../../Components/Global/ReportPageLayout.jsx';



const Genrallager = ({
    handleLocationChange,
    locationOptions,
    storeOptions,
    isLoading
}) => {

    const status = [
        { label: "Post", value: "Post" },
        { label: "UnPost", value: "UnPost" },
        { label: "Both", value: "Both" }
    ];

    const stageOptions = [
        { label: "Stage All", value: "StageAll", Stage: "0" },
        { label: "Stage 1", value: "Stage1", Stage: "1" },
        { label: "Stage 2", value: "Stage2", Stage: "2" },
        { label: "Stage 3", value: "Stage3", Stage: "3" },
        { label: "Stage 4", value: "Stage4", Stage: "4" }
    ];
    const [isOpen, SetisOpen,] = useState(true)
    const [qtyType, setQtyType,] = useState('Box')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [location, setLocation] = useState([])
    const [storeforDrp, setStoreForDrp] = useState([])
    const [selectedLocation, setSelectedLocation] = useState([])
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const [slectedStore, setSlectedStore] = useState("")
    const [Store, setStore] = useState('')
    const [Accounts, setAccounts] = useState("")
    const [dataStatus, setDataStatus] = useState('')
    const [allAccounts, setAllAccounts] = useState([])
    const [accountOptions, setAccountOptions] = useState([])
    const [fromAccount, setFromAccount] = useState(null)
    const [toAccount, setToAccount] = useState(null)
    const [selectedStage, setSelectedStage] = useState('Stage4')
    const [quickSelect, setQuickSelect] = useState('Custom')
    const [years, setYears] = useState([])
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('')

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

    const quickSelectOptions = [
        { label: "Custom", value: "Custom" },
        { label: "Year to Date", value: "YearToDate" },
        { label: "Month to Date", value: "MonthToDate" }
    ];

    const handleQuickSelect = (value) => {
        setQuickSelect(value)
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        const currentMonth = String(today.getMonth() + 1).padStart(2, '0');

        if (value === "MonthToDate") {
            setSelectedMonth(currentMonth);
            const firstDay = `${currentYear}-${currentMonth}-01`;
            const lastDay = todayStr;
            setStartDate(firstDay);
            setEndDate(lastDay);
        } else if (value === "YearToDate") {
              const [startDate, endDate] = years.at(-1).label.split(" to ");
            setSelectedYear(years.at(-1).value)
            setStartDate(startDate)
            setEndDate(endDate)
        }
    }

    const handleMonthChange = (month) => {
        setSelectedMonth(month.value);
        const firstDay = `${currentYear}-${month.value}-01`;
        const lastDayDate = new Date(currentYear, parseInt(month.value), 0);
        const lastDay = `${currentYear}-${month.value}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
        setStartDate(firstDay);
        setEndDate(lastDay);
    }

    const handleYearChange = (year) => {
        setSelectedYear(year.value)
        console.log(year)
        const   [startDate, endDate] =  year.label.split(" to ");
        if (quickSelect === "YearToDate") {
            
            setStartDate(startDate)
            setEndDate(endDate)
        }
    }


    //console.log(Accounts)

    const getProduct = async () => {

        const Location = await getDataFundtion("/Location")
        const Store = await getDataFundtion("/Store")
        const Account = await getDataFundtion("/chartofAccounts/Stage4")
        const allAccountsRes = await getDataFundtion("/chartofAccounts")
        const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
        // If user is not boss, only show assigned accounts (or none if none assigned)
        let filteredStage4 = Account.data || [];
        let filteredAccounts = allAccountsRes.data || allAccountsRes || [];
        if (loginVendor.isBoss !== true) {
            const userAccountIds = new Set(loginVendor.ChartOfAccounts || []);
            filteredStage4 = filteredStage4.filter(acc => userAccountIds.has(acc._id));
            filteredAccounts = filteredAccounts.filter(acc => userAccountIds.has(acc._id));
        }
        setAccounts(filteredStage4)
        setAllAccounts(filteredAccounts)
        setStoreForDrp(Store.data)

        const yearList = yearRes.map((item) => ({
            label: `${item.DateStart} to ${item.DateEnd}`,
            value: item.DateStart.split('-')[0]
        }));
        setYears(yearList)

        setSelectedLocation(loginVendor.Location)
        //console.log(storeforDrp.push(0))
        const allstore = Store.data.map((item) => ({
            label: item.StoreName,
            value: item._id,
        }));
        const headOffice = [{
            label: "Head Office",
            value: "0",
        }]
        const totalStore = headOffice.concat(allstore)
        const allstoreValue = totalStore.map((item) => item.value)
        
        setStore(headOffice.concat(allstore))

//console.log(loginVendor)

    }
    //console.log(slectedStore)
    useEffect(() => {
        getProduct()
    }, [])

    useEffect(() => {
        const stageNum = stageOptions.find(s => s.value === selectedStage)?.Stage || '0';
        const filtered = stageNum === '0'
            ? allAccounts
            : allAccounts.filter(acc => String(acc.Stage) === stageNum);
        const options = filtered.map(acc => ({
            label: `${acc.AccountCode} - ${acc.AccountName}`,
            value: acc._id || acc.id,
            Stage: acc.Stage,
            code: acc.AccountCode
        }));
        setAccountOptions(options)
        setFromAccount(null)
        setToAccount(null)
    }, [selectedStage, allAccounts])

    const handleFromAccountChange = (selected) => {
        setFromAccount(selected);
        setToAccount(selected);
    };

    const toAccountOptions = fromAccount
        ? accountOptions.filter((_, index) => {
            const fromIndex = accountOptions.findIndex(opt => opt.value === fromAccount.value);
            return index >= fromIndex;
        })
        : accountOptions;

    const changeStage = (e) => {
        if (e.Stage === "0") {
            const listOfAccount = allAccounts.map(acc => ({ label: acc.AccountName, value: acc._id || acc.id, Stage: acc.Stage }));
            setAccountOptions(listOfAccount)
            setSelectedStage(e.value)
        } else {
            const listOfAccount = accountOptions.filter(acc => acc.Stage === e.Stage).map(acc => ({ label: acc.label, value: acc.value, Stage: acc.Stage }));
            setAccountOptions(listOfAccount)
            setSelectedStage(e.value)
        }
    }

    const openPopupTab = async () => {

        if (startDate === "" || endDate === "") {
            return toast.error("Please enter start & end date")
        }
        const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
        if (!popup) return alert('Popup blocked');

        popup.document.title = 'General Ledger';
        popup.document.body.innerHTML = `<div id="popup-root">

    </div>`;
        const submitData = {
            startDate: startDate,
            endDate: endDate,
            store: slectedStore,
            allStore : storeforDrp,
            fromAccount: fromAccount?.code || '',
            toAccount: toAccount?.code || '',
            fromAccountName: fromAccount?.label || '',
            toAccountName: toAccount?.label || '',
            PrintedBy : `${loginVendor.firstname}`,
            chartofAccount : Accounts
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<GenrallagerPopup data={submitData} value={value} />);
            }
        }, 100);

        setValue(2)
    }

    const [showPopup, setShowPopup] = useState(false);
    const [value, setValue] = useState(1)

    return (
    <ReportPageLayout title="General Ledger">
        <>
            <div className="pd-card p-6 w-[90%] max-w-md mx-[30%] my-[5%]">
                <ToastContainer />
                <div className="grid grid-cols-5 md:grid-cols-2 gap-4">
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
                            className="w-full mt-1 p-2 border rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Date To</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full mt-1 p-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Stage</label>
                        <AppSelect
                            options={stageOptions}
                            value={stageOptions.find(opt => opt.value === selectedStage)}
                            onChange={(e) => changeStage(e)}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Stage..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">From Account</label>
                        <AppSelect
                            options={accountOptions}
                            value={fromAccount}
                            onChange={(e) => handleFromAccountChange(e)}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select From..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">To Account</label>
                        <AppSelect
                            options={toAccountOptions}
                            value={toAccount}
                            onChange={(e) => setToAccount(e)}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select To..."
                        />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium">Department</label>
                        <AppSelect
                            isMulti
                            options={Store}
                            onChange={(options) => {
                                const selectedValues = options.map((opt) => opt.value);
                                setSlectedStore(selectedValues);
                            }}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Store"
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <button
                            onClick={() => openPopupTab()}
                            disabled={isLoading}
                            className={`pd-btn-save w-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {isLoading ? 'Processing...' : 'Submit'}
                        </button>
                    </div>
                </div>

            </div>
        </>
    </ReportPageLayout>
    )

};

export default Genrallager;