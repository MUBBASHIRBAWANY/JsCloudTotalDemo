import express from "express";
import { AllProductByStore, getAllProductQty, updateProductRate } from "../Controllar/TotalProductControllar.js"


const TotalProductRouter = express.Router()

TotalProductRouter.get('/', getAllProductQty)
TotalProductRouter.get('/AllProductByStore/:Store', AllProductByStore)
TotalProductRouter.put('/updateProductRate', updateProductRate)

export default TotalProductRouter