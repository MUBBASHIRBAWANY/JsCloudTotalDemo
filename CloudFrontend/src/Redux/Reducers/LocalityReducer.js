import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    locality : []
}

const Locality = createSlice({
    name: "locality",
    initialState,
    reducers: {
        fetchLocality: (state, action) => {
            //console.log(action.payload)
            state.locality = action.payload
        },
        
    },
 
})

export const { fetchLocality} = Locality.actions
export default Locality.reducer