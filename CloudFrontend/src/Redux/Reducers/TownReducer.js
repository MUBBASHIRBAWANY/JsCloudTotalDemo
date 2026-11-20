import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    Town : []
}

const Town = createSlice({
    name: "Town",
    initialState,
    reducers: {
        fetchTown: (state, action) => {
            //console.log(action.payload)
            state.Town = action.payload
        },
        
    },
 
})

export const { fetchTown} = Town.actions
export default Town.reducer