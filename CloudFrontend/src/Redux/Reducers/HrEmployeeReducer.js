import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    hrEmployee: []
}

const HrEmployee = createSlice({
    name: "hrEmployee",
    initialState,
    reducers: {
        fetchHrEmployee: (state, action) => {
            state.hrEmployee = action.payload
        },
    },
})

export const { fetchHrEmployee } = HrEmployee.actions
export default HrEmployee.reducer
