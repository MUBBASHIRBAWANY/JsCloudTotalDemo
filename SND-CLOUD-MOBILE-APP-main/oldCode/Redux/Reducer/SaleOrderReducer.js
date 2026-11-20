import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    SalesOrder: []
}

const SalesOrder = createSlice({
    name: "SalesOrder",
    initialState,
    reducers: {
        fetchSalesOrder: (state, action) => {
            console.log(action.payload)
            state.SalesOrder = action.payload
        },
        AddSaleOrder: (state, action) => {
            state.SalesOrder.push(action.payload)   
                
        },
        updateSaleOrder: (state, action) => {
            const index = state.SalesOrder.findIndex((order) => order.id === action.payload.id);
            if (index >= 0) state.SalesOrder[index] = action.payload;
        },
        removeSaleOrder: (state, action) => {
            state.SalesOrder = state.SalesOrder.filter(order => order.id !== action.payload);
        } 

    },

})

export const { fetchSalesOrder, AddSaleOrder, updateSaleOrder, removeSaleOrder} = SalesOrder.actions
export default SalesOrder.reducer