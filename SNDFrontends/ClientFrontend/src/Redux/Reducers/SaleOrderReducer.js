import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    SaleOrder: []
}

const SaleOrder = createSlice({
    name: "SaleOrder",
    initialState,
    reducers: {
        fetchSaleOrder: (state, action) => {
            console.log(action.payload)
            state.SaleOrder = action.payload
        },
        updateDateSaleOrder: (state, action) => {
            const index = state.SaleOrder.findIndex(post => post._id === action.payload.id);
            state.SaleOrder[index].Status = action.payload.status
            console.log(state.SaleOrder)
        },
        AddSaleOrder: (state, action) => {
            state.SaleOrder.unshift(action.payload)
        },
        EditSaleOrder: (state, action) => {
            console.log(action.payload)
            const index = state.SaleOrder.findIndex(post => post._id === action.payload._id);
            state.SaleOrder[index] = action.payload
        }
    },

})

export const { fetchSaleOrder, updateDateSaleOrder,AddSaleOrder,EditSaleOrder } = SaleOrder.actions
export default SaleOrder.reducer