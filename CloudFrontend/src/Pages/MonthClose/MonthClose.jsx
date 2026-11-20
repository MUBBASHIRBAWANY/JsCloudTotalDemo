import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppSelect from '../../Components/Global/AppSelect.jsx';
import { getDataFundtion, updateDataFunction } from '../../Api/CRUDFunctions';

const MonthClose = () => {
  const navigate = useNavigate();
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
  const [UserYear, setUserYear] = useState([]);
  const [YearMonth, setYearMonth] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    if (loginVendor?.email !== "admin@js.com") {
      toast.error("Only admin can access this page");
      navigate('/');
    }
  }, [loginVendor, navigate]);

  const getData = async () => {
    try {
      const data = await getDataFundtion("/Openinginventory/getAllYear");
      const YearValue = data.map((item) => ({
        label: `${item.DateStart} to ${item.DateEnd}`,
        DateStart: `${item.DateStart}`,
        DateEnd: `${item.DateEnd}`
      }));
      setUserYear(YearValue);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const SelectYear = (year) => {
    setSelectedYear(year);
    setSelectedMonths([]);

    const start = new Date(year.DateStart);
    const end = new Date(year.DateEnd);
    const months = [];
    let current = new Date(start);

    while (current <= end) {
      months.push({
        value: current.toLocaleString("default", {
          month: "long",
          year: "numeric"
        }),
        label: current.toLocaleString("default", {
          month: "long",
          year: "numeric"
        })
      });
      current.setMonth(current.getMonth() + 1);
    }

    setYearMonth(months);
  };

  const handleCloseMonth = (selected) => {
    const months = selected ? selected.map(x => x.value) : [];
    setSelectedMonths(months);
  };

  const handleSubmit = async () => {
    if (!selectedYear) {
      return toast.error("Please select a year");
    }
    if (selectedMonths.length === 0) {
      return toast.error("Please select at least one month to close");
    }

    setDisabled(true);

    try {
      const usersRes = await getDataFundtion("/users");
      const users = usersRes.data;

      const yearKey = `${selectedYear.DateStart} to ${selectedYear.DateEnd}`;

      const updatePromises = users.map((user) => {
        let userCloseMonth = user.userCloseMonth || [];
        const exist = userCloseMonth.find(x => x.year === yearKey);

        if (exist) {
          const merged = [...new Set([...exist.months, ...selectedMonths])];
          userCloseMonth = userCloseMonth.map(x =>
            x.year === yearKey ? { ...x, months: merged } : x
          );
        } else {
          userCloseMonth = [
            ...userCloseMonth,
            { year: yearKey, months: [...selectedMonths] }
          ];
        }
console.log(userCloseMonth)
        return updateDataFunction(`/users/user/${user._id}`, {
          userCloseMonth
        });
      });

      await Promise.all(updatePromises);

      toast.success(`Months closed successfully for ${users.length} users`);
      setDisabled(false);
    } catch (err) {
      setDisabled(false);
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">
        Close All User Months
      </h1>

      <div className="pd-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="pd-label">Select Year</label>
            <AppSelect
              onChange={(val) => SelectYear(val)}
              options={UserYear}
            />
          </div>

          <div>
            <label className="pd-label">Close Month</label>
            <AppSelect
              isMulti
              options={YearMonth}
              value={YearMonth.filter(item =>
                selectedMonths.includes(item.value)
              )}
              onChange={handleCloseMonth}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled}
            className="pd-btn-save px-6 py-2 text-sm md:text-base"
          >
            {disabled ? "Saving..." : "Close Months"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthClose;
