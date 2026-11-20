import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    groups: {
        EBF: [],
        Loan: [],
        Advance: [],
        BadDebt: [],
    },
};

const EmployeeSubAccountReducer = createSlice({
    name: "EmployeeSubAccount",
    initialState,
    reducers: {
        fetchEmployeeSubAccounts: (state, action) => {
            state.groups = {
                EBF: action.payload?.EBF || [],
                Loan: action.payload?.Loan || [],
                Advance: action.payload?.Advance || [],
                BadDebt: action.payload?.BadDebt || [],
            };
        },
    },
});

export const { fetchEmployeeSubAccounts } = EmployeeSubAccountReducer.actions;
export default EmployeeSubAccountReducer.reducer;
