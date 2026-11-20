import React from 'react'
import FixedAssetList from '../../../Components/Accounts/FixedAsset/FixedAssetList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import { useNavigate } from 'react-router-dom'

const FixedAssetListPage = () => {
  const navigate = useNavigate()
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Fixed Assets</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/PostDepreciation')}
            className="pd-btn-success px-4 py-2 text-sm md:text-base"
          >
            Post Depreciation
          </button>
          <AppButton to="/FixedAssetAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
        </div>
      </div>
      <FixedAssetList />
    </div>
  )
}

export default FixedAssetListPage
