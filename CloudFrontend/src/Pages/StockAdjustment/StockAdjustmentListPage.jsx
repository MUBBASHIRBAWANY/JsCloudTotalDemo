import React from 'react'
import StockAdjustmentList from '../../Components/StockAdjustment/StockAdjustmentList'
import AppButton, { PlusIcon } from '../../Components/Global/AppButton'
import { useSelector } from 'react-redux'

const StockAdjustmentListPage = () => {
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const AddStockAdjustment = UserRihts.find((item) => item == "Add Stock Adjustment")
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Stock Adjustment</h2>
                <div className="flex items-center gap-3">
                    {AddStockAdjustment && (
                        <AppButton to="/StockAdjustmentAdd" variant="outline" icon={<PlusIcon />}>
                            Add
                        </AppButton>
                    )}
                </div>
            </div>
            <StockAdjustmentList />
        </div>
    )
}

export default StockAdjustmentListPage
