import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    leaveType: [],
    leaveApplication: []
}

const LeaveType = createSlice({
    name: "leaveType",
    initialState,
    reducers: {
        fetchLeaveType: (state, action) => {
            state.leaveType = action.payload
        },
        fetchLeaveApplication: (state, action) => {
            state.leaveApplication = action.payload
        },
    },
})

export const { fetchLeaveType, fetchLeaveApplication } = LeaveType.actions
export default LeaveType.reducer
