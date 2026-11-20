import React from 'react'
import ChannelList from '../../../Components/Client/Channel/ChannelList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const ChannelListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Channels</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/ChannelAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/ChannelAddBulk" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <ChannelList />
    </div>
  )
}

export default ChannelListPage