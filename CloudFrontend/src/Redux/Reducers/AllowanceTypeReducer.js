import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    allowanceType: []
}

const AllowanceType = createSlice({
    name: "allowanceType",
    initialState,
    reducers: {
        fetchAllowanceType: (state, action) => {
            state.allowanceType = action.payload
        },
    },
})

export const { fetchAllowanceType } = AllowanceType.actions
export default AllowanceType.reducer
