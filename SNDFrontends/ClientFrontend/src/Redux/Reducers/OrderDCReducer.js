import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    OrderDc: []
}

const OrderDc = createSlice({
    name: "OrderDc",
    initialState,
    reducers: {
        fetchOrderDc: (state, action) => {
            console.log(action.payload)
            state.OrderDc = action.payload
        },
        updateDateOrderDc: (state, action) => {
            const index = state.OrderDc.findIndex(post => post._id === action.payload.id);
            state.OrderDc[index].Status = action.payload.status
            console.log(state.OrderDc)
        },
        AddSaleOrderReducer: (state, action) => {
            state.OrderDc.unshift(action.payload)
        },
        EditSaleOrderReducer: (state, action) => {
            console.log(action.payload)
            const index = state.OrderDc.findIndex(post => post._id === action.payload._id);
            state.OrderDc[index] = action.payload
        }
    },

})

export const { fetchOrderDc, updateDateOrderDc, AddSaleOrderReducer , EditSaleOrderReducer } = OrderDc.actions
export default OrderDc.reducer