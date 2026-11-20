import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    department: []
}

const Department = createSlice({
    name: "department",
    initialState,
    reducers: {
        fetchDepartment: (state, action) => {
            state.department = action.payload
        },
    },
})

export const { fetchDepartment } = Department.actions
export default Department.reducer
