import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    PurchaseOrderDCRcvd: []
}

const PurchaseOrderDCRcvd = createSlice({
    name: "PurchaseOrderDCRcvd",
    initialState,
    reducers: {
        fetchPurchaseOrderDCRcvd: (state, action) => {
            console.log(action.payload)
            state.PurchaseOrderDCRcvd = action.payload
        },
        
    },

})

export const { fetchPurchaseOrderDCRcvd } = PurchaseOrderDCRcvd.actions
export default PurchaseOrderDCRcvd.reducer