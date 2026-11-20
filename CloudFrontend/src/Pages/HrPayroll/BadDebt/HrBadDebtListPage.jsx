import React from "react";
import BadDebtList from "../../../Components/HrPayroll/BadDebt/BadDebtList";
import AppButton, { PlusIcon } from "../../../Components/Global/AppButton";
import { useNavigate } from "react-router-dom";

const HrBadDebtListPage = () => {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Bad Debt Opening Balance</h2>
        <div className="flex gap-2">
          <AppButton to="/HrBadDebtAdd" icon={<PlusIcon />}>
            Add
          </AppButton>
          <button
            onClick={() => navigate("/HrBadDebtBulkAdd")}
            className="pd-btn-outline px-4 py-2 text-sm"
          >
            Bulk Add
          </button>
        </div>
      </div>
      <BadDebtList />
    </div>
  );
};

export default HrBadDebtListPage;
