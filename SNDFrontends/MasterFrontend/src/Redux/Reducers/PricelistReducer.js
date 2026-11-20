import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    PricelistReducer : []
}

const PricelistReducer = createSlice({
    name: "PricelistReducer",
    initialState,
    reducers: {
        fetchPricelistReducer: (state, action) => {
            state.PricelistReducer = action.payload
        },
        
    },
 
})

export const { fetchPricelistReducer} = PricelistReducer.actions
export default PricelistReducer.reducer