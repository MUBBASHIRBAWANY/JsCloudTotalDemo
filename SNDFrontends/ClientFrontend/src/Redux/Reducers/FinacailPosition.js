import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    CustomerRecVable: [],
    ProductValue: [],
    TotalSales: [],
    BankAndCashPosition: [],
    PayablePosition: [],
    ReciveablePosition: []
}

const FinacailPosition = createSlice({
    name: "finacailPosition",
    initialState,
    reducers: {
        fetchCustomerRecVable: (state, action) => {
            state.CustomerRecVable = action.payload
        },
        fetchproductValue: (state, action) => {
            state.ProductValue = action.payload
        },
        fetchTotalSales: (state, action) => {
            state.TotalSales = action.payload
        },
        fetchBankAndCashPosition: (state, action) => {
            state.BankAndCashPosition = action.payload
        },
        fetchPayablePosition: (state, action) => {
            state.PayablePosition = action.payload
        },
        fetchRecivablePosition: (state, action) => {
            state.ReciveablePosition = action.payload
        },
    },

})

export const { fetchTotalSales, fetchCustomerRecVable, fetchproductValue, fetchPayablePosition, fetchBankAndCashPosition , fetchRecivablePosition } = FinacailPosition.actions
export default FinacailPosition.reducer