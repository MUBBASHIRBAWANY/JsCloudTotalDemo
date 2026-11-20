import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    OpeningInventory : []
}

const OpeningInventory = createSlice({
    name: "OpeningInventory",
    initialState,
    reducers: {
        fetchOpeningInventory: (state, action) => {
            console.log(action.payload)
            state.OpeningInventory = action.payload
        },
        
    },
 
})

export const { fetchOpeningInventory} = OpeningInventory.actions
export default OpeningInventory.reducer