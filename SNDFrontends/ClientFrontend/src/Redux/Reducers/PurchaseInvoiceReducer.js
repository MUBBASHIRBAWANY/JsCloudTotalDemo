import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    PurchaseInvoice : []
}

const PurchaseInvoice = createSlice({
    name: "PurchaseInvoice",
    initialState,
    reducers: {
        fetchPurchaseInvoice: (state, action) => {
            console.log(action.payload)
            state.PurchaseInvoice = action.payload
        },
        updateDatePurchaseInvoice  : (state, action) =>{
            console.log(action)
            const index = state.PurchaseInvoice.findIndex(post => post._id === action.payload.id);
            state.PurchaseInvoice[index].PostStatus = action.payload.status
            console.log(state.PurchaseInvoice)
        },
        AddPurchaseInvoice : (state, action) =>{
            state.PurchaseInvoice.unshift(action.payload)
        },
        EditPurchaseInvoice : (state, action) =>{
            console.log(action.payload)
            const index = state.PurchaseInvoice.findIndex(post => post._id === action.payload._id);
            state.PurchaseInvoice[index] = action.payload
        }
    },
 
})

export const { fetchPurchaseInvoice , updateDatePurchaseInvoice , AddPurchaseInvoice , EditPurchaseInvoice} = PurchaseInvoice.actions
export default PurchaseInvoice.reducer