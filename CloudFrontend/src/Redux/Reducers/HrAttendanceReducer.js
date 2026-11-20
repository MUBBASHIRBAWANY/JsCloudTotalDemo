import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    hrAttendance: []
}

const HrAttendance = createSlice({
    name: "hrAttendance",
    initialState,
    reducers: {
        fetchHrAttendance: (state, action) => {
            state.hrAttendance = action.payload
        },
    },
})

export const { fetchHrAttendance } = HrAttendance.actions
export default HrAttendance.reducer
