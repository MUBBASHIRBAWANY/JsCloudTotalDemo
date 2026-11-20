import express from "express";
import { AgingData, cancelLoad, createSalesInvoice, getAllSalesInvoiceByDistributer, getAllSalesInvoiceByLoadForm, getAllSalesInvoices, getAllSalesInvoicesByMultipleDistributers, getDistributorAnalytics, getOrderBookerSale, OnlyReaminInvoice, SalesDumpData, SalesInvoiceSummary, SattelDsr} from "../Controllar/SalesInvoiceControllar.js";
import e from "express";
import { AllStockReport } from "../Controllar/StockInventoryReport.js";
const SalesInvoiceRouter = express.Router()

SalesInvoiceRouter.post('/', createSalesInvoice )
SalesInvoiceRouter.get('/Distributer/:Distributer', getAllSalesInvoiceByDistributer)
SalesInvoiceRouter.get('/LoadForm/:LoadForm', getAllSalesInvoiceByLoadForm)
SalesInvoiceRouter.post("/cancelLoadInvoice", cancelLoad)
SalesInvoiceRouter.post("/SattelDsr", SattelDsr)
SalesInvoiceRouter.get("/InvoiceAging", AgingData)
SalesInvoiceRouter.get("/OnlyReaminInvoice/:Distrbutor", OnlyReaminInvoice)
SalesInvoiceRouter.get("/SalesDumpdate", SalesDumpData)
SalesInvoiceRouter.get("/StockReport", AllStockReport)
SalesInvoiceRouter.get("/DistributorAnalytics", getDistributorAnalytics)
SalesInvoiceRouter.get("/OrderBookerSale", getOrderBookerSale)
SalesInvoiceRouter.get("/InvoiceSummary", SalesInvoiceSummary)
SalesInvoiceRouter.get("/AllInvoices", getAllSalesInvoices)
SalesInvoiceRouter.get("/InvoicesByDistributers", getAllSalesInvoicesByMultipleDistributers)

export default SalesInvoiceRouter