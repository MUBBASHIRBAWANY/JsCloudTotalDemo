import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    DistributroReducers : []
}

const DistributroReducers = createSlice({
    name: "DistributroReducers",
    initialState,
    reducers: {
        fetchDistributroReducers: (state, action) => {
            //console.log(action.payload)
            state.DistributroReducers = action.payload
        },
        
    },
 
})

export const { fetchDistributroReducers} = DistributroReducers.actions
export default DistributroReducers.reducer