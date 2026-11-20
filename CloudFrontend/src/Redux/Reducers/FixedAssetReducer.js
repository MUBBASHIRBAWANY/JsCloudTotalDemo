import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  FixedAsset: [],
};

const FixedAssetReducer = createSlice({
  name: 'FixedAsset',
  initialState,
  reducers: {
    fetchFixedAsset: (state, action) => {
      state.FixedAsset = action.payload;
    },
  },
});

export const { fetchFixedAsset } = FixedAssetReducer.actions;
export default FixedAssetReducer.reducer;
