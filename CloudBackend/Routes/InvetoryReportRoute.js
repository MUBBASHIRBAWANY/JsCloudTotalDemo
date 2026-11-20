import express from "express";
import { getSalesInvoiceByDate, getSalesInvoiceByDateByProduct, getSalesInvoiceByDateFrYearEnd } from "../Controllar/InventoryReportControllar.js";
import { getStockFlowReport } from "../Controllar/StockFlowReportControllar.js";
import { getDistributorStockFlowReport } from "../Controllar/DistributorStockFlowReportControllar.js";
import { getNewStockFlowReport } from "../Controllar/NewStockFlowReportController.js";
import { allPurchaseDumpData, allPurchaseSummry, allRCDumpData } from "../Controllar/PurchaseDumpData.js";
import { Costing, TransferInReport } from "../Controllar/InventoryTransferInControllar.js";


const InventoryReportRoute = express.Router()

InventoryReportRoute.get("/GetDataByDate" , getSalesInvoiceByDate)
// InventoryReportRoute.get("/StockFlowReport" , getStockFlowReport)
InventoryReportRoute.get("/DistributorStockFlowReport" , getDistributorStockFlowReport)
InventoryReportRoute.get("/StockFlowReport" , getNewStockFlowReport)
InventoryReportRoute.get("/getSalesInvoiceByDateFrYearEnd" , getSalesInvoiceByDateFrYearEnd)
InventoryReportRoute.get("/GetDataByDateProduct" , getSalesInvoiceByDateByProduct)
InventoryReportRoute.get("/PurchaseDumpData" , allPurchaseDumpData)
InventoryReportRoute.get("/PurchaseSummry" , allPurchaseSummry)
InventoryReportRoute.get("/RCReport" , allRCDumpData)
InventoryReportRoute.get("/TransferInReport" , TransferInReport)
InventoryReportRoute.get("/Costing" , Costing)    



export default InventoryReportRoute