import express from "express";
import { closeAllOrder, createDc, DcByDate, deleteSaleOrderDC, getAllDc, getBuiltyNumber, getDcById, GetDcNotEqualFalse, getDcList, getDcNumber, posteDc, updateBuilty, UpdateDc, UpdateDcStatus } from "../Controllar/OrderDCControllar.js";
import { getDcQtyReport } from "../Controllar/DocumentQtyReportControllar.js";

const OrderDCRouter = express.Router()


OrderDCRouter.post('/', createDc )
OrderDCRouter.get("/report", getDcQtyReport)
OrderDCRouter.get("/", getAllDc)
OrderDCRouter.put("/UpdateDc/:id", UpdateDc )
OrderDCRouter.put("/updateBuilty/:id", updateBuilty )
OrderDCRouter.put("/UpdateDcStatus/:id", UpdateDcStatus )
OrderDCRouter.put("/posteDc/:id" , posteDc)
OrderDCRouter.get("/GetDcNotEqualFalse" , GetDcNotEqualFalse)
OrderDCRouter.get("/getDcNumber" , getDcNumber)
OrderDCRouter.get("/getBuiltyNumber/:DCCode" , getBuiltyNumber)
// OrderDCRouter.get("/closeAllOrder" , closeAllOrder)
OrderDCRouter.delete("/deleteSaleOrderDC/:id" , deleteSaleOrderDC)
OrderDCRouter.get("/DcByDate" , DcByDate)
OrderDCRouter.get("/list", getDcList)
OrderDCRouter.get("/:id", getDcById)


export default OrderDCRouter