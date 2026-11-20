import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getDataFundtion, updateDataFunction } from "../../../Api/CRUDFunctions";

const LoanOpeningEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [employees, setEmployees] = useState([]);
  const [tableData, setTableData] = useState([]);
  const { reset, register, handleSubmit } = useForm();

  useEffect(() => {
    const fetchData = async () => {
      const res = await getDataFundtion("/EmployeeLoanAccount");
      const empList = (res.data || []).map((acc) => ({
        id: acc._id,
        empId: acc.empId,
        name: acc.name,
      }));
      setEmployees(empList);

      const openingRes = await getDataFundtion(`/LoanOpeningBalance/${id}`);
      const opening = openingRes.data;
      if (opening) {
        reset({ DateStart: opening.DateStart, DateEnd: opening.DateEnd });
        if (Array.isArray(opening.EmployeesData)) {
          setTableData(
            opening.EmployeesData.map((row, idx) => {
              const matched = empList.find((acc) =>
                String(acc.id) === String(row._id)
                || String(acc.empId) === String(row.empId || row.employeeId)
              );
              return {
                id: Date.now() + idx,
                employeeId: matched ? matched.id : (row._id || row.employeeId || ""),
                empId: matched ? matched.empId : (row.empId || row.employeeId || ""),
                employeeName: matched ? matched.name : (row.employeeName || ""),
                openingBalance: row.openingBalance || 0,
              };
            })
          );
        }
      }
    };
    fetchData();
  }, []);

  const addNewRow = () => {
    setTableData([
      ...tableData,
      {
        id: Date.now(),
        employeeId: "",
        empId: "",
        employeeName: "",
        openingBalance: 0,
      },
    ]);
  };

  const removeRow = (id) => {
    setTableData(tableData.filter((row) => row.id !== id));
  };

  const handleCellChange = (id, field, value) => {
    setTableData(
      tableData.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };
          if (field === "employeeId") {
            const emp = employees.find((e) => e.id === value);
            updatedRow.employeeName = emp ? emp.name : "";
            updatedRow.empId = emp ? emp.empId : "";
            if (row.employeeId !== value) {
              updatedRow.openingBalance = 0;
            }
          }
          return updatedRow;
        }
        return row;
      })
    );
  };

  const totalBalance = tableData.reduce(
    (sum, row) => sum + (parseFloat(row.openingBalance) || 0),
    0
  );

  const onSubmit = async (data) => {
    data.EmployeesData = tableData.map((row) => ({
      _id: row.employeeId,
      empId: row.empId,
      employeeId: row.empId,
      employeeName: row.employeeName,
      openingBalance: parseFloat(row.openingBalance) || 0,
    }));
    try {
      await updateDataFunction(`/LoanOpeningBalance/updateLoanOpening/${id}`, data);
      toast.success("Loan Opening Balance updated");
      setTimeout(() => navigate("/LoanOpeningBalance"), 2000);
    } catch (err) {
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">
        Loan Opening Balance (Edit)
      </h1>
      <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">
              Year From
            </label>
            <input
              type="date"
              {...register("DateStart", { required: true })}
              className="pd-input text-sm md:text-base"
            />
          </div>
          <div>
            <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">
              Year To
            </label>
            <input
              type="date"
              {...register("DateEnd", { required: true })}
              className="pd-input text-sm md:text-base"
            />
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr className="pd-bg-muted">
                <th className="border p-2 min-w-[250px]">Employee</th>
                <th className="border p-2">Opening Balance</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} className="hover:pd-bg-muted">
                  <td className="border p-2">
                    <select
                      value={row.employeeId}
                      onChange={(e) => handleCellChange(row.id, "employeeId", e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.openingBalance}
                      onChange={(e) =>
                        handleCellChange(row.id, "openingBalance", e.target.value)
                      }
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="pd-btn-icon-danger text-xs md:text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {tableData.length !== 0 && (
              <tfoot>
                <tr className="pd-table-footer">
                  <td className="border p-2 text-right font-bold">Total:</td>
                  <td className="border p-2 font-bold">{totalBalance}</td>
                  <td className="border p-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <button
            type="button"
            onClick={addNewRow}
            className="pd-btn-success px-4 py-2 text-sm md:text-base"
          >
            Add Row
          </button>
          <button type="submit" className="pd-btn-save text-sm md:text-base">
            Update Opening Balance
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanOpeningEdit;
