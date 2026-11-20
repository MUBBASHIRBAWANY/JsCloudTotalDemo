import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    TargetReducer : []
}

const TargetReducer = createSlice({
    name: "TargetReducer",
    initialState,
    reducers: {
        fetchTargetReducer: (state, action) => {
            state.TargetReducer = action.payload
        },
        
    },
 
})

export const { fetchTargetReducer} = TargetReducer.actions
export default TargetReducer.reducer