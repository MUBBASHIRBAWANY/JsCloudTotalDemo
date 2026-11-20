import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    Remaininginvoice : []
}

const Remaininginvoice = createSlice({
    name: "Remaininginvoice",
    initialState,
    reducers: {
        fetchRemaininginvoice: (state, action) => {
            //console.log(action.payload)
            state.Remaininginvoice = action.payload
        },
        updateDateRemaininginvoice  : (state, action) =>{
            const index = state.Remaininginvoice.findIndex(post => post._id === action.payload.id);
            state.Remaininginvoice[index].PostStatus = action.payload.status
            //console.log(state.Remaininginvoice)
        }
    },
 
})

export const { fetchRemaininginvoice , updateDateRemaininginvoice} = Remaininginvoice.actions
export default Remaininginvoice.reducer