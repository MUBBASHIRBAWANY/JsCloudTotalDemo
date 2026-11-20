import express from "express";
import { BulkpostSalesinvoice, createSalesInvoice, createSalesInvoiceBulk, deleteSaleInvoice, getAllSaleInvoice,  getInvByNumber,  getInvoiceByref,  getInvoicePaymentAging,  getClientAgingLedger,  matchClientAgingToLedger,  rebuildClientAgingFromBottom,  getLimitedSaleInvoice,  getOnlyInvoiceAging,  getOnlyInvoiceAging1,  getOnlyRemain,  getOnlyRemainInvoice,  getOnlyRemainInvoiceAmount,  getOnlySummry,  getRemainOnlyByCustomer,  getSalesInvoiceNumber,  getSalesInvoiceNumberWithouStatus,  postSalesinvoice, postSalesinvoiceBulk, ProductSalesSummry, SalesDumpData, SalesinvoiceSummry, UnpostSalesinvoiceBulk, updateRemarks, UpdateSaleData, UpdateSalesInvoice } from "../Controllar/SalesInvoiceControllar.js";
import checkPermission from "../Midelware/CheckRights.js";
import { financialYearMiddleware } from "../utils/checkFinancialYear.js";

const SalesInvoiceRouter = express.Router()

// Sales Invoice CRUD
SalesInvoiceRouter.post('/', checkPermission("Add Sales"), financialYearMiddleware("InvoiceDate"), createSalesInvoice)
SalesInvoiceRouter.get('/', checkPermission("List Sales"), getAllSaleInvoice)
SalesInvoiceRouter.put('/UpdateSalesInvoice/:id', checkPermission("Edit Sales"), UpdateSalesInvoice)
SalesInvoiceRouter.delete('/SaleInvoiceDelete/:id', checkPermission("Delete Sales"), deleteSaleInvoice)

// Sales Invoice Post/UnPost
// Uses status field in request body: true=Post, false=UnPost
SalesInvoiceRouter.put('/ChangeStatus/:id', (req, res, next) => {
    const { status } = req.body;
    const perm = status === true ? "Post Sales" : "UnPost Sales";
    return checkPermission(perm)(req, res, next);
}, postSalesinvoice)

// Bulk Operations
SalesInvoiceRouter.post('/PushinBulk', checkPermission("Add Sales Bulk"), createSalesInvoiceBulk)
SalesInvoiceRouter.put('/BulkpostSalesinvoice', (req, res, next) => {
    const { status } = req.body;
    const perm = status === true ? "Post Sales" : "UnPost Sales";
    return checkPermission(perm)(req, res, next);
}, BulkpostSalesinvoice)

// Data fetching routes
SalesInvoiceRouter.get("/getLimitedSaleInvoice", checkPermission("List Sales"), getLimitedSaleInvoice)
SalesInvoiceRouter.get('/getOnlyRemain', checkPermission("List Sales"), getOnlyRemain)
SalesInvoiceRouter.get('/getOnlyRemainInvoiceAmount', checkPermission("List Sales"), getOnlyRemainInvoiceAmount)
SalesInvoiceRouter.get("/getOnlyRemainInvoice", checkPermission("List Sales"), getOnlyRemainInvoice)
SalesInvoiceRouter.get("/getOnlySummry", checkPermission("List Sales"), getOnlySummry)
SalesInvoiceRouter.get("/SalesinvoiceSummry", checkPermission("List Sales"), SalesinvoiceSummry)
SalesInvoiceRouter.get("/getOnlyInvoiceAging", checkPermission("List Sales"), getOnlyInvoiceAging)
SalesInvoiceRouter.get("/getOnlyInvoiceAging1", checkPermission("List Sales"), getOnlyInvoiceAging1)
SalesInvoiceRouter.get("/getInvoicePaymentAging", checkPermission("List Sales"), getInvoicePaymentAging)
SalesInvoiceRouter.get("/getClientAgingLedger", checkPermission("List Sales"), getClientAgingLedger)
SalesInvoiceRouter.post("/matchClientAgingToLedger", checkPermission("List Sales"), matchClientAgingToLedger)
SalesInvoiceRouter.post("/rebuildClientAgingFromBottom", checkPermission("List Sales"), rebuildClientAgingFromBottom)
SalesInvoiceRouter.get("/getInvByNumber/:invNUmber", checkPermission("View Sales"), getInvByNumber)
SalesInvoiceRouter.get("/ProductSalesSummry", checkPermission("List Sales"), ProductSalesSummry)
SalesInvoiceRouter.get("/SalesDumpData", checkPermission("List Sales"), SalesDumpData)
SalesInvoiceRouter.get("/OnlyNumber/:status", checkPermission("List Sales"), getSalesInvoiceNumber)
SalesInvoiceRouter.get("/OnlyNumberWithouStatus/", checkPermission("List Sales"), getSalesInvoiceNumberWithouStatus)

// Bulk Post/UnPost
SalesInvoiceRouter.put('/postSalesinvoiceBulk', (req, res, next) => {
    const perm = req.body.invstatus === true ? "Post Sales" : "UnPost Sales";
    return checkPermission(perm)(req, res, next);
}, postSalesinvoiceBulk)
SalesInvoiceRouter.put('/UnpostSalesinvoiceBulk', checkPermission("UnPost Sales"), UnpostSalesinvoiceBulk)
SalesInvoiceRouter.put("/UpdateSaleData", checkPermission("Edit Sales"), UpdateSaleData)
SalesInvoiceRouter.get("/getInvoiceByref/:SalesFlowRef", checkPermission("View Sales"), getInvoiceByref)
SalesInvoiceRouter.put("/updateRemarks/:id", checkPermission("Edit Sales"), updateRemarks)
SalesInvoiceRouter.get("/getRemainOnlyByCustomer/:customerId", checkPermission("List Sales"), getRemainOnlyByCustomer)

export default SalesInvoiceRouter

