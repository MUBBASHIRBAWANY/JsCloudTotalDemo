import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    Distributor: [],
}

const distributors = createSlice({
    name: "distributors",
    initialState,
    reducers: {
        fetchDistributor: (state, action) => {
            state.Distributor = action.payload
        },
    },
})

export const { fetchDistributor } = distributors.actions
export default distributors.reducer