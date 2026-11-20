import express from "express";
import { CreatePriceList, GetALLPriceList, GetPriceList, updatePRiceList } from "../Controllar/PriceListControllar.js";



const PriceListRouter = express.Router()

PriceListRouter.get("/" , GetPriceList)
PriceListRouter.get("/GetALLPriceList" , GetALLPriceList)
PriceListRouter.post("/" , CreatePriceList)
PriceListRouter.put("/UpdatePricelist/:id" , updatePRiceList)

export default PriceListRouter