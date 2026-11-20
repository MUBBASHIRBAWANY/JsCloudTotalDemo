import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    designation: []
}

const Designation = createSlice({
    name: "designation",
    initialState,
    reducers: {
        fetchDesignation: (state, action) => {
            state.designation = action.payload
        },
    },
})

export const { fetchDesignation } = Designation.actions
export default Designation.reducer
