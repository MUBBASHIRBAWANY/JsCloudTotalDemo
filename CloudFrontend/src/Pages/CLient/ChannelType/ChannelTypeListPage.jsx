import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import ChanneTypelList from "../../../Components/Client/ChannelType/ChannelTypeList"

const ChannelTypeListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Channel Types</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/ChannelTypeAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/ChannelTypeAddBulk" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <ChanneTypelList />
    </div>
  )
}

export default ChannelTypeListPage