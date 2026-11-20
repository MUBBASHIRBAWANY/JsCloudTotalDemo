import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { getDataFundtion, updateDataFunction } from "../../Api/CRUDFunctions";

const FinancialYear = () => {
  const [years, setYears] = useState([]);
  const [activeYear, setActiveYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settingYear, setSettingYear] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [activeRes, allRes] = await Promise.all([
        getDataFundtion("/FinancialYear/active"),
        getDataFundtion("/FinancialYear/all"),
      ]);

      const activeData = activeRes?.data?.data || activeRes?.data || null;
      const allData = allRes?.data?.data || allRes?.data || [];

      setActiveYear(activeData);
      setYears(allData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load financial year data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSetActive = async (yearId) => {
    setSettingYear(true);
    try {
      const res = await updateDataFunction(`/FinancialYear/set-active/${yearId}`, {});
      toast.success(res?.data?.message || "Financial Year updated successfully");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to set active year");
    } finally {
      setSettingYear(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-4 md:p-6">
      <ToastContainer />
      <h1 className="text-xl md:pd-page-title text-center mb-6">
        Financial Year Management
      </h1>

      {/* Active Year Status Card */}
      <div className="pd-card p-4 md:p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Current Active Financial Year</h2>
            {activeYear ? (
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  {activeYear.label || `${activeYear.startDate} to ${activeYear.endDate}`}
                </span>
                <span className="text-xs text-gray-500">
                  (Today: {today})
                </span>
              </div>
            ) : (
              <p className="text-amber-600 text-sm mt-2">
                ⚠ No active Financial Year set. Transactions will be blocked until you set one.
              </p>
            )}
          </div>
          <div className="text-right text-sm text-gray-500">
            {activeYear && (
              <>
                <p>From: <strong>{activeYear.startDate}</strong></p>
                <p>To: <strong>{activeYear.endDate}</strong></p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* All Years List */}
      <div className="pd-card p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Available Financial Years</h2>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : years.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No financial years found. Create an Opening Inventory first.
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">#</th>
                  <th className="border p-3 text-left">Start Date</th>
                  <th className="border p-3 text-left">End Date</th>
                  <th className="border p-3 text-center">Status</th>
                  <th className="border p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {years.map((year, idx) => {
                  const isActive = year.status === "Open" || year.status === "Active";
                  return (
                    <tr
                      key={year._id}
                      className={`hover:bg-gray-50 transition-colors ${
                        isActive ? "bg-green-50" : ""
                      }`}
                    >
                      <td className="border p-3 text-center">{idx + 1}</td>
                      <td className="border p-3">{year.startDate}</td>
                      <td className="border p-3">{year.endDate}</td>
                      <td className="border p-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            isActive
                              ? "bg-green-100 text-green-700"
                              : year.status === "Closed"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-amber-100 text-amber-600"
                          }`}
                        >
                          {isActive ? "Active" : year.status || "Inactive"}
                        </span>
                      </td>
                      <td className="border p-3 text-center">
                        {!isActive ? (
                          <button
                            onClick={() => handleSetActive(year._id)}
                            disabled={settingYear}
                            className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {settingYear ? "Setting..." : "Set Active"}
                          </button>
                        ) : (
                          <span className="text-green-600 text-xs font-medium">
                            ✓ Currently Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <strong>Note:</strong> Only one Financial Year can be active at a time. 
          Transactions are only allowed within the active year's date range.
          The active year's Opening Inventory status should be "Open".
        </div>
      </div>
    </div>
  );
};

export default FinancialYear;
