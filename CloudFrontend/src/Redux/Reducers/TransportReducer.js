import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    Transport : []
}

const Transport = createSlice({
    name: "Transport",
    initialState,
    reducers: {
        fetchTransport: (state, action) => {
            //console.log(action.payload)
            state.Transport = action.payload
        },
        
    },
 
})

export const { fetchTransport} = Transport.actions
export default Transport.reducer