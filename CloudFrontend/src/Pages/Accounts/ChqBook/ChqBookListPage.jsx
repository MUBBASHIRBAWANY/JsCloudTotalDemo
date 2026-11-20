import React from 'react'
import ChqBookList from '../../../Components/Accounts/ChqBook/ChqBookList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const ChqBookListPage = () => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Cheque Books</h2>
                <div className="flex items-center gap-3">
                    <AppButton to="/ChqBookAdd" variant="outline" icon={<PlusIcon />}>
                        Add
                    </AppButton>
                </div>
            </div>
            <ChqBookList />
        </div>
    )
}

export default ChqBookListPage