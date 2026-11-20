import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    customerChq : []
}

const customerChq = createSlice({
    name: "Channel",
    initialState,
    reducers: {
        fetchcustomerChq: (state, action) => {
            //console.log(action.payload)
            state.customerChq = action.payload
        },
        
    },
 
})

export const { fetchcustomerChq} = customerChq.actions
export default customerChq.reducer