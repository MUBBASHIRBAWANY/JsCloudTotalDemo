import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    APi : []
}

const APi = createSlice({
    name: "Channel",
    initialState,
    reducers: {
        fetchAPi: (state, action) => {
            //console.log(action.payload)
            state.APi = action.payload
        },
        
    },
 
})

export const { fetchAPi} = APi.actions
export default APi.reducer