import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    SalesInvoice: []
}

const SalesInvoice = createSlice({
    name: "SalesInvoice",
    initialState,
    reducers: {
        fetchSalesInvoice: (state, action) => {
            console.log(action.payload)
            state.SalesInvoice = action.payload
        },
        updateDateSalesInvoice: (state, action) => {
            const index = state.SalesInvoice.findIndex(post => post._id === action.payload.id);
            state.SalesInvoice[index].PostStatus = action.payload.status
            console.log(state.SalesInvoice)
        },
        AddSalesInvoice: (state, action) => {
            state.SalesInvoice.unshift(action.payload)
        },
        EditSalesInvoice: (state, action) => {
            console.log(action.payload)
            const index = state.SalesInvoice.findIndex(post => post._id === action.payload._id);
            state.SalesInvoice[index] = action.payload
        }
    },

 
})

export const { fetchSalesInvoice, updateDateSalesInvoice ,AddSalesInvoice , EditSalesInvoice} = SalesInvoice.actions
export default SalesInvoice.reducer