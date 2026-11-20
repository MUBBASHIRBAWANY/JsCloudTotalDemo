import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    companyPolicy: null
}

const CompanyPolicy = createSlice({
    name: "companyPolicy",
    initialState,
    reducers: {
        fetchCompanyPolicy: (state, action) => {
            state.companyPolicy = action.payload
        },
    },
})

export const { fetchCompanyPolicy } = CompanyPolicy.actions
export default CompanyPolicy.reducer
