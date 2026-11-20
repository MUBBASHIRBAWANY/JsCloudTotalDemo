import express from "express";
import { allPurchaseDumpData, createPurchaseOrderDC, DeletePurchaseOrderDC, getAllPurchaseOrderDC, getPurchaseOrderDCByDistributor, PostPurchaseOrderDC } from "../Controllar/PurchaseOrderDcConttrollar.js";


const PurchaseOrderDCRouter = express.Router()


PurchaseOrderDCRouter.post('/', createPurchaseOrderDC )
PurchaseOrderDCRouter.get("/PurchaseOrderByDistributor/:Distrbutor", getPurchaseOrderDCByDistributor)
PurchaseOrderDCRouter.get("/", getAllPurchaseOrderDC)
PurchaseOrderDCRouter.delete("/DeleteDC/:id" , DeletePurchaseOrderDC)       
PurchaseOrderDCRouter.post("/PostPurchaseOrderDC/:id" , PostPurchaseOrderDC)
PurchaseOrderDCRouter.get("/PurchaseRepor" , allPurchaseDumpData)


export default PurchaseOrderDCRouter