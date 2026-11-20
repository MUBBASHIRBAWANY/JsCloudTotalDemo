import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    Rc : []
}

const Rc = createSlice({
    name: "Rc",
    initialState,
    reducers: {
        fetchRc: (state, action) => {
            //console.log(action.payload)
            state.Rc = action.payload
        },
        updateDateRc  : (state, action) =>{
            const index = state.Rc.findIndex(post => post._id === action.payload.id);
            state.Rc[index].PostStatus = action.payload.status
            //console.log(state.Rc)
        }
    },
 
})

export const { fetchRc , updateDateRc} = Rc.actions
export default Rc.reducer