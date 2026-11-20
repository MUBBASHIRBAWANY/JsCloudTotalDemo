import React from 'react'
import ProductList from '../../../Components/Product/Product/ProductList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const ProductListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Products</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/ProductAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/ProductBulkAdd" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
          <AppButton to="/ProductBulkUpdate" icon={<PlusIcon />}>
            Update in Bulk
          </AppButton>
        </div>
      </div>
      <ProductList />
    </div>
  )
}

export default ProductListPage