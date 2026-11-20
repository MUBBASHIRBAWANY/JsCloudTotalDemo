import React from 'react'
import Grouplist from "../../../Components/Client/Group/GroupList.jsx"
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

import * as XLSX from 'xlsx';
const GrouplistPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Groups</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/GroupAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/GroupAddBulk" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <Grouplist />
    </div>
  )
}

export default GrouplistPage