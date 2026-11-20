import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    DitributorInvoice: [],
    BuiltyInvoice : [],
    ReaminInvoice : []
}

const DitributorInvoice = createSlice({
    name: "DitributorInvoice",
    initialState,
    reducers: {
        fetchDitributorInvoice: (state, action) => {
            state.DitributorInvoice = action.payload
        },
        fetchBuiltyInvoice: (state, action) => {
            state.BuiltyInvoice = action.payload
        },
        updateDateDitributorInvoice: (state, action) => {
            const index = state.DitributorInvoice.findIndex(post => post._id === action.payload.id);
            state.DitributorInvoice[index].Status = action.payload.status
            //console.log(state.DitributorInvoice)
        },
        AddSaleOrderReducer: (state, action) => {
            state.DitributorInvoice.unshift(action.payload)
        },
        EditSaleOrderReducer: (state, action) => {
            //console.log(action.payload)
            const index = state.DitributorInvoice.findIndex(post => post._id === action.payload._id);
            state.DitributorInvoice[index] = action.payload
        },

        OnlyRemainInvoice: (state, action) => {
            //console.log(action.payload)
            state.ReaminInvoice = action.payload
        }
    },

})

export const { fetchDitributorInvoice, OnlyRemainInvoice, fetchBuiltyInvoice,updateDateDitributorInvoice, AddSaleOrderReducer , EditSaleOrderReducer } = DitributorInvoice.actions
export default DitributorInvoice.reducer