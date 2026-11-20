import express from "express";
import { AddPurchaseInvoiceInbulk, createPurchaseInvoice, deletePurchcaseInvoice, getAllPurchaseInvoice, getPrInvByNumber, postPurchaseinvoice, updatePurchaseInvoice, updateTotalAmount } from "../Controllar/PurchaseInvoiceControllar.js";
import checkPermission from "../Midelware/CheckRights.js";
import { financialYearMiddleware } from "../utils/checkFinancialYear.js";

const PurchaseInvoiceRouter = express.Router()


PurchaseInvoiceRouter.post('/', checkPermission("Add Purchase"), financialYearMiddleware("PurchaseDate"), createPurchaseInvoice),
PurchaseInvoiceRouter.get('/', checkPermission("List Purchase"), getAllPurchaseInvoice),
// PurchaseInvoiceRouter.get('/updateTotalAmount', updateTotalAmount),
PurchaseInvoiceRouter.put('/PurchaseInvoiceUpdate/:id', checkPermission("Edit Purchase"), updatePurchaseInvoice)
PurchaseInvoiceRouter.delete("/PurchaseInvoiceDelete/:id", checkPermission("Delete Purchase"), deletePurchcaseInvoice)
PurchaseInvoiceRouter.post('/AddinBulk', checkPermission("Add Purchase Bulk"), AddPurchaseInvoiceInbulk)
PurchaseInvoiceRouter.put('/Changestatus/:id', (req, res, next) => {
    const { status } = req.body;
    const perm = status === true ? "Post Purchase" : "UnPost Purchase";
    return checkPermission(perm)(req, res, next);
}, postPurchaseinvoice)
PurchaseInvoiceRouter.get('/getPrInvByNumber/:invNUmber', checkPermission("View Purchase"), getPrInvByNumber)


export default PurchaseInvoiceRouter



