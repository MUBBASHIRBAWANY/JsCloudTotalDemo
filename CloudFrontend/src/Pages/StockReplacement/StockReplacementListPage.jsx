import React from 'react'
import StockReplacementList from '../../Components/StockReplacement/StockReplacementList'
import AppButton, { PlusIcon } from '../../Components/Global/AppButton'
import StockReplacementPost from '../../Components/StockReplacement/StockReplacementPost'
import StockReplacementUnPost from '../../Components/StockReplacement/StockReplacementUnpost'
import { useSelector } from 'react-redux'

const StockReplacementListPage = () => {
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const AddStockReplacement = UserRihts.find((item) => item == "Add Stock Replacement")
  const AddStockReplacementBulk = UserRihts.find((item) => item == "Add Stock Replacement Bulk")
  const PostStockReplacement = UserRihts.find((item) => item == "Post Stock Replacement")
  const UnPostStockReplacement = UserRihts.find((item) => item == "UnPost Stock Replacement")
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Stock Replacement</h2>
        <div className="flex items-center gap-3">
          {AddStockReplacement && (
            <AppButton to="/StockReplacementAdd" variant="outline" icon={<PlusIcon />}>
              Add
            </AppButton>
          )}
          {AddStockReplacementBulk && (
            <AppButton to="/StockReplacementBulkAdd" icon={<PlusIcon />}>
              Add in Bulk
            </AppButton>
          )}
          <div className="w-px h-6 pd-divider" />
          {PostStockReplacement ? <StockReplacementPost /> : null}
          {UnPostStockReplacement ? <StockReplacementUnPost /> : null}
        </div>
      </div>
      <StockReplacementList />
    </div>
  )
}

export default StockReplacementListPage