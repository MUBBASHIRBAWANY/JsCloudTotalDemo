import React from 'react'
import StoreList from '../../../Components/Users/Store/StoreList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const StoreListPage = () => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Stores</h2>
                <div className="flex items-center gap-3">
                    <AppButton to="/StoreAdd" variant="outline" icon={<PlusIcon />}>
                        Add
                    </AppButton>
                </div>
            </div>
            <StoreList />
        </div>
    )
}

export default StoreListPage