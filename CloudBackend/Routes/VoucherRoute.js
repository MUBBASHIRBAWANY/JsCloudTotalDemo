import {createVoucher, getVouchers, getVoucherByCode, updateVoucher, deleteVoucher, createSystemVoucher, getVoucherById, getVoucherByNumber, deleteVoucherByNumber,  PostUnPostVoucher, PostUnPostCashReciptVoucher, createRealizeVoucher, PushVoucherBulkData, createPreviouseVoucher, getOnlyVoucherByNumber, getOnlyCredit, AdjustVoucher,   JvPost, VoucherNumber, getAllCredit, UpdateClient, FillVoucherClientStore, DeleteVocuher, getLastVoucherByDate, VoucherByID, JvUnPost, getVoucherInvoiceRefReport, GetVoucherRealizePreview, RealizeVoucherLine, GetStrictKnockOffPreview, ApplyStrictKnockOff, GetClientLedgerBalance} from '../Controllar/VoucherControllar.js';


import express from 'express';
import checkPermission from "../Midelware/CheckRights.js";
import { financialYearMiddleware } from "../utils/checkFinancialYear.js";

const VoucherRouter = express.Router();

// ===== CASH RECEIPT VOUCHER =====
VoucherRouter.post('/', checkPermission("Add Cash Receipt"),  createVoucher);
VoucherRouter.put('/update/:id', checkPermission("Edit Cash Receipt"),  updateVoucher);
VoucherRouter.get('/', checkPermission("List Cash Receipt Voucher"), getVouchers);
VoucherRouter.get('/GetLastVouher/:VoucherType', getVoucherByCode);
VoucherRouter.post('/GetLastVouherByDate/:VoucherType', getLastVoucherByDate);
VoucherRouter.delete('/delete/:id', checkPermission("Delete Cash Receipt"), deleteVoucher);
VoucherRouter.post("/createSystemVoucher", createSystemVoucher)
VoucherRouter.get("/getVoucherById/:id", getVoucherById)
VoucherRouter.get("/VoucherByID/:id", getVoucherById)
VoucherRouter.get("/getVoucherByNumber/:VoucherNumber", getVoucherByNumber)
VoucherRouter.delete('/deleteVoucher/:VoucherNumber', checkPermission("Delete Cash Receipt"), deleteVoucherByNumber)

// ===== POST / UNPOST VOUCHERS =====
// Helper to determine correct permission based on VoucherType and action
const getVoucherPostPerm = (voucherType, isPost) => {
    const prefix = isPost ? "Post" : "UnPost";
    const typeMap = {
        "BR": `${prefix} Bank Receipt`,
        "BP": `${prefix} Bank Payment`,
        "CR": `${prefix} Cash Receipt`,
        "CP": `${prefix} Cash Payment`,
        "JV": `${prefix} Journal Voucher`,
    };
    return typeMap[voucherType] || `${prefix} Cash Receipt`;
};

// PostUnPostVoucher handles Bank Receipt & Bank Payment
// Uses req.body.VoucherType OR infers from VoucherNumber prefix
VoucherRouter.post("/CustomerRecipt/:id", (req, res, next) => {
    const { status, VoucherType, VoucherNumber } = req.body;
    // status !== "Post" means we are POSTING, status === "Post" means UNPOSTING
    const isPost = status !== "Post";
    const vType = VoucherType || (VoucherNumber ? VoucherNumber.substring(0, 2) : "BR");
    const perm = getVoucherPostPerm(vType, isPost);
    return checkPermission(perm)(req, res, next);
}, PostUnPostVoucher)

// PostUnPostCashReciptVoucher handles Cash Receipt & Cash Payment
VoucherRouter.post("/CustomerCashRecipt/:id", (req, res, next) => {
    const { status, VoucherType, VoucherNumber } = req.body;
    const isPost = status !== "Post";
    const vType = VoucherType || (VoucherNumber ? VoucherNumber.substring(0, 2) : "CR");
    const perm = getVoucherPostPerm(vType, isPost);
    return checkPermission(perm)(req, res, next);
}, PostUnPostCashReciptVoucher)

// Journal Voucher Post
VoucherRouter.put("/JvPost/:id", (req, res, next) => {
    const { status } = req.body;
    const isPost = status !== "Post";
    const perm = isPost ? "Post Journal Voucher" : "UnPost Journal Voucher";
    return checkPermission(perm)(req, res, next);
}, JvPost)

VoucherRouter.put("/JvUnPost/:id", (req, res, next) => {
    const { status } = req.body;
    const isPost = status !== "UnPost";
    const perm = isPost ? "Post Journal Voucher" : "UnPost Journal Voucher";
    return checkPermission(perm)(req, res, next);
}, JvUnPost)

// ===== REALIZE & OTHER OPERATIONS =====
VoucherRouter.post("/RealizeVoucher", checkPermission("Realize Payment"), createRealizeVoucher)
VoucherRouter.get("/getOnlyVoucherByNumber/:VoucherNumber", getOnlyVoucherByNumber)
VoucherRouter.post("/createPreviouseVoucher", createPreviouseVoucher)
VoucherRouter.post("/PushVoucherBulkData", checkPermission("Add Cash Receipt"), PushVoucherBulkData)
VoucherRouter.get("/getOnlyCredit/:distributor", getOnlyCredit)
VoucherRouter.get("/ClientLedgerBalance/:clientId", checkPermission("Knockoff"), GetClientLedgerBalance)
VoucherRouter.put("/AdjustVoucher", AdjustVoucher)
VoucherRouter.get("/RealizeByNumber/:VoucherNumber", checkPermission("Knockoff"), GetVoucherRealizePreview)
VoucherRouter.put("/RealizeVoucherLine", checkPermission("Knockoff"), RealizeVoucherLine)
VoucherRouter.get("/StrictKnockOff/:clientId", checkPermission("Knockoff"), GetStrictKnockOffPreview)
VoucherRouter.put("/StrictKnockOff", checkPermission("Knockoff"), ApplyStrictKnockOff)
// VoucherRouter.put("/ReduceKnockOff", checkPermission("Knockoff"), ReduceKnockOff)
// VoucherRouter.put("/MatchAgingLedger", checkPermission("Knockoff"), MatchAgingLedger)
VoucherRouter.get("/VoucherNumber/:voucher", VoucherNumber)
VoucherRouter.get("/getAllCredit", getAllCredit)
VoucherRouter.get("/getVoucherInvoiceRefReport", getVoucherInvoiceRefReport)
VoucherRouter.post("/FillClientStore", FillVoucherClientStore)
VoucherRouter.get("/UpdateClient", UpdateClient)
VoucherRouter.get("/DeleteVocuher", DeleteVocuher)
export default VoucherRouter;
