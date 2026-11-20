import React from 'react';
import SlabList from '../../../Components/Distrbutor/Slab/SlabList';
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton';
import PushToSND from '../../../Components/Global/PushToSND';

const SlabPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Slab Management</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/SlabAdd" variant="outline" icon={<PlusIcon />}>
            Add Slab
          </AppButton>
          {/* <PushToSND type="slab" label="Push to SND" /> */}
        </div>
      </div>
      <SlabList />
    </div>
  );
};

export default SlabPage;
