import React from 'react'
import TerrotoryList from '../../../Components/Client/Terrotory/TerrotoryList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const Terrotorylistpage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Territories</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/TerrotoryAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/TerrotoryAddBulk" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <TerrotoryList />
    </div>
  )
}

export default Terrotorylistpage