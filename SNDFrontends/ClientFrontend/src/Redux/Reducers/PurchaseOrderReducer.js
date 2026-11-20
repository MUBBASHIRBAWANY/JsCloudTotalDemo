import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    PurchaseOrder: []
}

const PurchaseOrder = createSlice({
    name: "PurchaseOrder",
    initialState,
    reducers: {
        fetchPurchaseOrder: (state, action) => {
            console.log(action.payload)
            state.PurchaseOrder = action.payload
        },
        AddPurchaseOrder: (state, action) => {
            state.PurchaseInvoice.unshift(action.payload)
        },
    },

})

export const { fetchPurchaseOrder , AddPurchaseOrder} = PurchaseOrder.actions
export default PurchaseOrder.reducer