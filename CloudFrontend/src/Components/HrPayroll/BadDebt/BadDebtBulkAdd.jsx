import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { createDataFunction } from "../../../Api/CRUDFunctions";
import { getDataFundtion } from "../../../Api/CRUDFunctions";

const BadDebtBulkAdd = () => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getDataFundtion("HrEmployee/"),
      getDataFundtion("/EmployeeBadDebtAccount"),
    ]).then(([empRes, accRes]) => {
      setEmployees(empRes.data || []);
      setAccounts(accRes.data || []);
    });
  }, []);

  const onSubmit = async () => {
    setLoading(true);
    const employeesData = [];
    const errors = [];

    data.forEach((row, idx) => {
      const code = String(row.EmployeeCode || row.Code || row.code || "").trim();
      const amount = parseFloat(row.Amount || row.BadDebt || row.badDebt || 0);
      const emp = employees.find((e) => String(e.code).trim() === code);

      if (!emp) {
        errors.push(`Row ${idx + 1}: Employee code "${code}" not found`);
        return;
      }

      const acc = accounts.find((a) => String(a.empId) === String(emp._id));
      if (!acc) {
        errors.push(`Row ${idx + 1}: No Bad Debt account for "${code}"`);
        return;
      }

      employeesData.push({
        _id: acc._id,
        empId: acc.empId,
        employeeId: acc.empId,
        employeeName: acc.name,
        amount: amount,
      });
    });

    if (errors.length > 0) {
      toast.error(errors.slice(0, 3).join("\n"));
      setLoading(false);
      return;
    }

    if (employeesData.length === 0) {
      toast.error("No valid data found in Excel");
      setLoading(false);
      return;
    }

    const dateStart = data[0]?.DateStart || data[0]?.StartDate || "";
    const dateEnd = data[0]?.DateEnd || data[0]?.EndDate || "";

    const payload = {
      DateStart: dateStart,
      DateEnd: dateEnd,
      EmployeesData: employeesData,
      Status: "false",
    };

    try {
      await createDataFunction("/HrBadDebt", payload);
      toast.success("Bulk Bad Debt Opening added successfully!");
      setTimeout(() => navigate("/HrBadDebtList"), 2000);
    } catch (err) {
      toast.error("Something went wrong during upload.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = (e) => {
      const rawData = new Uint8Array(e.target.result);
      const workbook = XLSX.read(rawData, { type: "array" });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];

      setData(jsonData);
      setHeaders(firstRow);
    };

    reader.readAsArrayBuffer(file);
  };

  const downloadSample = () => {
    const sampleData = [
      { EmployeeCode: "EMP001", Amount: 5000, DateStart: "2026-01-01", DateEnd: "2026-12-31" },
      { EmployeeCode: "EMP002", Amount: 3000, DateStart: "2026-01-01", DateEnd: "2026-12-31" },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bad Debts");
    XLSX.writeFile(wb, "BadDebt_Sample.xlsx");
  };

  return (
    <div className="p-6 w-full">
      <ToastContainer />
      <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">
        Bad Debt Opening Balance (Bulk Add)
      </h1>

      <div className="pd-card p-4 md:p-6 mb-6">
        <div className="flex flex-col items-center gap-4 mb-4">
          <label
            htmlFor="baddebt-upload-input"
            className="pd-btn-success inline-flex items-center gap-2 px-6 py-3 text-sm cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Excel File
          </label>
          <input
            id="baddebt-upload-input"
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={downloadSample}
            className="pd-btn-outline inline-flex items-center gap-2 px-5 py-2 text-sm cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Sample Excel
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-2">
          <p><strong>Required columns:</strong> EmployeeCode, Amount</p>
          <p><strong>Optional columns:</strong> DateStart, DateEnd</p>
          <p className="mt-1">EmployeeCode must match the employee code in the system.</p>
        </div>
      </div>

      {data.length > 0 && (
        <div className="pd-card p-4 md:p-6">
          <h3 className="text-lg font-semibold pd-text-body mb-4">
            Preview ({data.length} rows)
          </h3>
          <div className="overflow-x-auto rounded-lg border pd-border-default shadow-md h-[50vh]">
            <table className="min-w-full divide-y divide-[color:var(--pd-border-card)] bg-white">
              <thead className="pd-bg-muted sticky top-0">
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider pd-text-muted"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--pd-border-card)]">
                {data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={rowIndex % 2 === 0 ? "bg-white" : "pd-bg-muted"}
                  >
                    {headers.map((header, colIndex) => (
                      <td
                        key={colIndex}
                        className="whitespace-nowrap px-6 py-4 text-sm pd-text-body"
                      >
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="pd-btn-save px-6 py-2 text-sm"
            >
              {loading ? "Submitting..." : "Submit All"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadDebtBulkAdd;
