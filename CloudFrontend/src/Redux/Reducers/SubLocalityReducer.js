import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    SubSublocality : []
}

const SubLocality = createSlice({
    name: "Sublocality",
    initialState,
    reducers: {
        fetchSubLocality: (state, action) => {
            //console.log(action.payload)
            state.Sublocality = action.payload
        },
        
    },
 
})

export const { fetchSubLocality} = SubLocality.actions
export default SubLocality.reducer