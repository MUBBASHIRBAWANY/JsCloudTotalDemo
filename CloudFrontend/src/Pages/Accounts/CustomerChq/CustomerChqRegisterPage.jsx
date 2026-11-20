import React from 'react';
import CustomerChqRegister from '../../../Components/Accounts/CustomerChq/CustomerChqRegister';
import AppButton from '../../../Components/Global/AppButton';

const CustomerChqRegisterPage = () => {
  return (
    <div className="p-5 md:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-[1280px] mx-auto">
        {/* Top page header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-2xl">💰</div>
              <h2 className="text-[22px] font-semibold pd-text-body tracking-tight">Customer Cheque Register</h2>
            </div>
            <p className="text-sm pd-text-muted pl-1 mt-0.5">View and manage pending customer cheques. Use checkboxes for bulk actions.</p>
          </div>
          <div className="flex items-center gap-2">
            <AppButton to="/CustomerChqStatus" variant="outline">
              Change Status
            </AppButton>
            <AppButton to="/CustomerChqList" variant="outline">
              Back to List
            </AppButton>
          </div>
        </div>

        <CustomerChqRegister />
      </div>
    </div>
  );
};

export default CustomerChqRegisterPage;
