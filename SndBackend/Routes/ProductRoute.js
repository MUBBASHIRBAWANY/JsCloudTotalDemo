import express from "express";
import { createProduct, getAllProduct, getProductNameId } from "../Controllar/ProductControllar.js";

const ProductRouter = express.Router()


ProductRouter.post('/', createProduct )
ProductRouter.get("/", getAllProduct)
ProductRouter.get("/getProductNameId" , getProductNameId)


export default ProductRouter