import express from "express";
import { getAllProductQty, getProductByDistriButor, recalculateStock } from "../Controllar/TotalProductControllar.js"


const TotalProductRouter = express.Router()

TotalProductRouter.get('/', getAllProductQty)
TotalProductRouter.post('/Recalculate', recalculateStock)
TotalProductRouter.get('/:Distrbutor', getProductByDistriButor)


export default TotalProductRouter