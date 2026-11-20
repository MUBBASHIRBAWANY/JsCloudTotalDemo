import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import SubChannelList from "../../../Components/Client/SubChannel/SubChannelList"

const SubChannelListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Sub Channels</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/SubChannelAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/SubChannelAddBulk" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <SubChannelList />
    </div>
  )
}

export default SubChannelListPage