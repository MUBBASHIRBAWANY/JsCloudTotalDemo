import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDataFundtion } from "../../../Api/CRUDFunctions";

const BadDebtView = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({ DateStart: "", DateEnd: "" });
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    getDataFundtion(`/HrBadDebt/${id}`).then((res) => {
      const opening = res.data;
      if (opening) {
        setFormData({ DateStart: opening.DateStart, DateEnd: opening.DateEnd });
        if (Array.isArray(opening.EmployeesData)) {
          setTableData(opening.EmployeesData);
        }
      }
    });
  }, [id]);

  const totalAmount = tableData.reduce(
    (sum, row) => sum + (parseFloat(row.amount) || 0),
    0
  );

  return (
    <div className="p-4">
      <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">
        Bad Debt Opening Balance (View)
      </h1>
      <div className="pd-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">
              Year From
            </label>
            <div className="border px-3 py-2 rounded-md pd-bg-muted text-sm">
              {formData.DateStart}
            </div>
          </div>
          <div>
            <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">
              Year To
            </label>
            <div className="border px-3 py-2 rounded-md pd-bg-muted text-sm">
              {formData.DateEnd}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr className="pd-bg-muted">
                <th className="border p-2 min-w-[250px]">Employee</th>
                <th className="border p-2">Opening Balance</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={index} className="hover:pd-bg-muted">
                  <td className="border p-2">{row.employeeName || row.employeeId}</td>
                  <td className="border p-2">{row.amount}</td>
                </tr>
              ))}
            </tbody>
            {tableData.length !== 0 && (
              <tfoot>
                <tr className="pd-table-footer">
                  <td className="border p-2 text-right font-bold">Total:</td>
                  <td className="border p-2 font-bold">{totalAmount}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default BadDebtView;
