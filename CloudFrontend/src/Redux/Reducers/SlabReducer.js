import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  SlabReducer: [],
};

const SlabReducer = createSlice({
  name: "SlabReducer",
  initialState,
  reducers: {
    fetchSlabReducer: (state, action) => {
      state.SlabReducer = action.payload;
    },
  },
});

export const { fetchSlabReducer } = SlabReducer.actions;
export default SlabReducer.reducer;
