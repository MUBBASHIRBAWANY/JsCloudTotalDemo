import React from 'react';
import SchemeList from '../../../Components/Distrbutor/Scheme/SchemeList';
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton';

const SchemePage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Scheme Management</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/PriceListSchemeAdd" variant="outline" icon={<PlusIcon />}>
            Add Scheme
          </AppButton>
        </div>
      </div>
      <SchemeList />
    </div>
  );
};

export default SchemePage;
