import React from "react";
import EBFOpeningList from "../../../Components/HrPayroll/EBFOpening/EBFOpeningList";
import AppButton, { PlusIcon } from "../../../Components/Global/AppButton";
import { useNavigate } from "react-router-dom";

const EBFOpeningListPage = () => {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">EBF Opening Balance</h2>
        <div className="flex gap-2">
          <AppButton to="/EBFOpeningAdd" icon={<PlusIcon />}>
            Add
          </AppButton>
          <button
            onClick={() => navigate("/EBFOpeningBulkAdd")}
            className="pd-btn-outline px-4 py-2 text-sm"
          >
            Bulk Add
          </button>
        </div>
      </div>
      <EBFOpeningList />
    </div>
  );
};

export default EBFOpeningListPage;
