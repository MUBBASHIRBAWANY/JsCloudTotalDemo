import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    Zsm: []
}

const Zsm = createSlice({
    name: "Zsm",
    initialState,
    reducers: {
        fetchZsm: (state, action) => {
            state.Zsm = action.payload
        },
    },
})

export const { fetchZsm } = Zsm.actions
export default Zsm.reducer
