import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    Product : []
}

const Product = createSlice({
    name: "Product",
    initialState,
    reducers: {
        fetchProduct: (state, action) => {
            
            state.Product = action.payload
        },
        
    },
 
})

export const { fetchProduct} = Product.actions
export default Product.reducer