import React from 'react'
import CityList from '../../../Components/Client/City/CityList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const CityListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Cities</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/CityAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
        </div>
      </div>
      <CityList />
    </div>
  )
}

export default CityListPage