import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    Group : []
}

const Group = createSlice({
    name: "Group",
    initialState,
    reducers: {
        fetchGroup: (state, action) => {
            //console.log(action.payload)
            state.Group = action.payload
        },
        
    },
 
})

export const { fetchGroup} = Group.actions
export default Group.reducer