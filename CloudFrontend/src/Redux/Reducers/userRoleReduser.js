import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    UsersRole: [],
    state: [],
}

const UsersRole = createSlice({
    name: "users",
    initialState,
    reducers: {
        fetchUserRole: (state, action) => {
            //console.log(action.payload)
            state.state = action.payload
        },
        
    },
 
})

export const { fetchUserRole} = UsersRole.actions
export default UsersRole.reducer