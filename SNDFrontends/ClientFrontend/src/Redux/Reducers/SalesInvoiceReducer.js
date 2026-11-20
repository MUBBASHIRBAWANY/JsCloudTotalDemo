import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    DisSalesInvoice: []
}

const SalesInvoice = createSlice({
    name: "SalesInvoice",
    initialState,
    reducers: {
        fetchSalesInvoice: (state, action) => {
            console.log(action.payload)
            state.DisSalesInvoice = action.payload
        },
        updateDateSalesInvoice: (state, action) => {
            const index = state.DisSalesInvoice.findIndex(post => post._id === action.payload.id);
            state.DisSalesInvoice[index].PostStatus = action.payload.status
            console.log(state.DisSalesInvoice)
        },
        AddSalesInvoice: (state, action) => {
            state.DisSalesInvoice.unshift(action.payload)
        },
        EditSalesInvoice: (state, action) => {
            console.log(action.payload)
            const index = state.DisSalesInvoice.findIndex(post => post._id === action.payload._id);
            state.DisSalesInvoice[index] = action.payload
        }
    },

 
})

export const { fetchSalesInvoice, updateDateSalesInvoice ,AddSalesInvoice , EditSalesInvoice} = SalesInvoice.actions
export default SalesInvoice.reducer