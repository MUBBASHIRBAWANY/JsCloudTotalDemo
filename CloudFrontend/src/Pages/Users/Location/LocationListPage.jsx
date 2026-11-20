import React from 'react'
import LocationList from '../../../Components/Users/Location/LocationList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const LocationListPage = () => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Locations</h2>
                <div className="flex items-center gap-3">
                    <AppButton to="/LocationAdd" variant="outline" icon={<PlusIcon />}>
                        Add
                    </AppButton>
                </div>
            </div>
            <LocationList />
        </div>
    )
}

export default LocationListPage