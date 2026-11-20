import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { createEBFOpening } from "../../../Api/EBFApi";
import { getDataFundtion } from "../../../Api/CRUDFunctions";

const EBFOpeningBulkAdd = () => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [hide, setHide] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getDataFundtion("HrEmployee/").then((res) => {
      setEmployees(res.data || []);
    });
  }, []);

  const onSubmit = async () => {
    setLoading(true);

    // Map Excel rows to employee data using employee code
    const employeesData = [];
    const errors = [];

    data.forEach((row, idx) => {
      const code = String(row.EmployeeCode || row.Code || row.code || "").trim();
      const balance = parseFloat(row.OpeningBalance || row.Balance || row.balance || 0);
      const emp = employees.find((e) => String(e.code).trim() === code);

      if (!emp) {
        errors.push(`Row ${idx + 1}: Employee code "${code}" not found`);
        return;
      }

      employeesData.push({
        employeeId: emp._id,
        employeeName: `${emp.code} - ${emp.firstName} ${emp.lastName || ""}`,
        openingBalance: balance,
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

    // Use first row's date or default
    const dateStart = data[0]?.DateStart || data[0]?.StartDate || "";
    const dateEnd = data[0]?.DateEnd || data[0]?.EndDate || "";

    const payload = {
      DateStart: dateStart,
      DateEnd: dateEnd,
      EmployeesData: employeesData,
      Status: "false",
    };

    try {
      await createEBFOpening(payload);
      toast.success("Bulk EBF Opening Balance added successfully!");
      setTimeout(() => navigate("/EBFOpeningBalance"), 2000);
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
    setHide(true);
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
      { EmployeeCode: "EMP001", OpeningBalance: 5000, DateStart: "2026-01-01", DateEnd: "2026-12-31" },
      { EmployeeCode: "EMP002", OpeningBalance: 3000, DateStart: "2026-01-01", DateEnd: "2026-12-31" },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EBF Opening");
    XLSX.writeFile(wb, "EBF_Opening_Sample.xlsx");
  };

  return (
    <div className="p-6 w-full">
      <ToastContainer />
      <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">
        EBF Opening Balance (Bulk Add)
      </h1>

      <div className="pd-card p-4 md:p-6 mb-6">
        <div className="flex flex-col items-center gap-4 mb-4">
          <label
            htmlFor="ebf-upload-input"
            className="pd-btn-success inline-flex items-center gap-2 px-6 py-3 text-sm cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Excel File
          </label>
          <input
            id="ebf-upload-input"
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
          <p><strong>Required columns:</strong> EmployeeCode, OpeningBalance</p>
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

export default EBFOpeningBulkAdd;
