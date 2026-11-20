import React from 'react';
import { useNavigate } from 'react-router-dom';

const OrderDCEdit = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4">
      <div className="pd-card p-6 md:p-10 max-w-xl mx-auto text-center">
        <h1 className="pd-page-title text-center mb-4">
          Edit Delivery Challan
        </h1>
        <p className="pd-text-muted mb-6">
          Editing of Delivery Challans has been disabled.
        </p>
        <button
          onClick={() => navigate("/OrderDCList")}
          className="pd-btn-outline"
        >
          Back to List
        </button>
      </div>
    </div>
  );
};

export default OrderDCEdit;
