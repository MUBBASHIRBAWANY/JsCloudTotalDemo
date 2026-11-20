import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    EBFOpeningReducer: []
};

const EBFOpeningReducer = createSlice({
    name: "EBFOpening",
    initialState,
    reducers: {
        fetchEBFOpeningReducer: (state, action) => {
            state.EBFOpeningReducer = action.payload;
        },
    },
});

export const { fetchEBFOpeningReducer } = EBFOpeningReducer.actions;
export default EBFOpeningReducer.reducer;
