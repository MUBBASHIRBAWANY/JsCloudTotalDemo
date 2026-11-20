import React from 'react'
import BrandList from '../../../Components/Product/Brand/BrandList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const BrandListPage = () => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Brands</h2>
                <div className="flex items-center gap-3">
                    <AppButton to="/BrandAdd" variant="outline" icon={<PlusIcon />}>
                        Add
                    </AppButton>
                    <AppButton to="/BulkBrandAdd" icon={<PlusIcon />}>
                        Add in Bulk
                    </AppButton>
                </div>
            </div>
            <BrandList />
        </div>
    )
}

export default BrandListPage