import React from 'react'
import CategoryList from '../../../Components/Product/Category/CategoryList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const CategoryListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Categories</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/CategoryAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/CategoryBulk" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <CategoryList />
    </div>
  )
}

export default CategoryListPage