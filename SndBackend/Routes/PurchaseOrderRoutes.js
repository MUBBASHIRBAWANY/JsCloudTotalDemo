import express from "express";
import { createPurchaseOrder, getAllPurchaseOrder, getOrders, getPurchaseOrderByDistributor, UpdateOrderStatus, UpdateOrderStatusByNumber } from "../Controllar/PurchaseOrderControllar.js";


const PurchaseOrderRouter = express.Router()


PurchaseOrderRouter.post('/', createPurchaseOrder )
PurchaseOrderRouter.get("/PurchaseOrderByDistributor/:Distrbutor", getPurchaseOrderByDistributor)
PurchaseOrderRouter.get("/", getAllPurchaseOrder)
PurchaseOrderRouter.put("/UpdateOrderStatus/:id" , UpdateOrderStatus)
PurchaseOrderRouter.put("/UpdateOrderStatusByNumber/:OrderCode" , UpdateOrderStatusByNumber)
PurchaseOrderRouter.get("/getOrders/" , getOrders)


export default PurchaseOrderRouter