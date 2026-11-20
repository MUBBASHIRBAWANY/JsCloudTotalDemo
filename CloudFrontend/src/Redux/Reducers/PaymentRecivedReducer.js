import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    PaymentRecived : []
}

const PaymentRecived = createSlice({
    name: "PaymentRecived",
    initialState,
    reducers: {
        fetchPaymentRecived: (state, action) => {
            state.PaymentRecived = action.payload
        },
        
    },
 
})

export const { fetchPaymentRecived} = PaymentRecived.actions
export default PaymentRecived.reducer