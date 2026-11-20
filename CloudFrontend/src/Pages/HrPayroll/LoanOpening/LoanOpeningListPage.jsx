import React from "react";
import LoanOpeningList from "../../../Components/HrPayroll/LoanOpening/LoanOpeningList";
import AppButton, { PlusIcon } from "../../../Components/Global/AppButton";
import { useNavigate } from "react-router-dom";

const LoanOpeningListPage = () => {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Loan Opening Balance</h2>
        <div className="flex gap-2">
          <AppButton to="/LoanOpeningAdd" icon={<PlusIcon />}>
            Add
          </AppButton>
          <button
            onClick={() => navigate("/LoanOpeningBulkAdd")}
            className="pd-btn-outline px-4 py-2 text-sm"
          >
            Bulk Add
          </button>
        </div>
      </div>
      <LoanOpeningList />
    </div>
  );
};

export default LoanOpeningListPage;
