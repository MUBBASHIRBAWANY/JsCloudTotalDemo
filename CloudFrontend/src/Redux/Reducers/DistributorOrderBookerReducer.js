import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    DistributorOrderBooker : []
}

const DistributorOrderBooker = createSlice({
    name: "DistributorOrderBooker",
    initialState,
    reducers: {
        fetchDistributorOrderBooker: (state, action) => {
            //console.log(action.payload)
            state.DistributorOrderBooker = action.payload
        },
        
    },
 
})

export const { fetchDistributorOrderBooker} = DistributorOrderBooker.actions
export default DistributorOrderBooker.reducer