import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    DistributorOrder: []
}

const DistributorOrder = createSlice({
    name: "DistributorOrder",
    initialState,
    reducers: {
        fetchDistributorOrder: (state, action) => {
            console.log(action.payload)
            state.DistributorOrder = action.payload
        },
        updateDateDistributorOrder: (state, action) => {
            const index = state.DistributorOrder.findIndex(post => post._id === action.payload.id);
            state.DistributorOrder[index].Status = action.payload.status
            console.log(state.DistributorOrder)
        },
        AddDistributorOrder: (state, action) => {
            state.DistributorOrder.unshift(action.payload)
        },
        EditDistributorOrder: (state, action) => {
            console.log(action.payload)
            const index = state.DistributorOrder.findIndex(post => post._id === action.payload._id);
            state.DistributorOrder[index] = action.payload
        }
    },

})

export const { fetchDistributorOrder, updateDateDistributorOrder,AddDistributorOrder,EditDistributorOrder } = DistributorOrder.actions
export default DistributorOrder.reducer