import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    LoadForm: []
}

const LoadForm = createSlice({
    name: "LoadForm",
    initialState,
    reducers: {
        fetchLoadForm: (state, action) => {
            console.log(action.payload)
            state.LoadForm = action.payload
        },
        updateDateLoadForm: (state, action) => {
            const index = state.LoadForm.findIndex(post => post._id === action.payload.id);
            state.LoadForm[index].PostStatus = action.payload.status
            console.log(state.LoadForm)
        },
        AddLoadForm: (state, action) => {
            state.LoadForm.unshift(action.payload)
        },
        EditLoadForm: (state, action) => {
            console.log(action.payload)
            const index = state.LoadForm.findIndex(post => post._id === action.payload._id);
            state.LoadForm[index] = action.payload
        }
    },

 
})

export const { fetchLoadForm, updateDateLoadForm ,AddLoadForm , EditLoadForm} = LoadForm.actions
export default LoadForm.reducer