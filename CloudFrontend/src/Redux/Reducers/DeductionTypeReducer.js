import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    deductionType: []
}

const DeductionType = createSlice({
    name: "deductionType",
    initialState,
    reducers: {
        fetchDeductionType: (state, action) => {
            state.deductionType = action.payload
        },
    },
})

export const { fetchDeductionType } = DeductionType.actions
export default DeductionType.reducer
