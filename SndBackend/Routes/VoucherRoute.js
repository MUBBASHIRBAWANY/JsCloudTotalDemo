import express from "express";
import {
    GetLastVoucher,
    CreateVoucher,
    GetAllVouchers,
    GetVouchersByType,
    GetVoucherById,
    UpdateVoucher,
    DeleteVoucher
} from "../Controllar/VoucherControllar.js";

const VoucherRouter = express.Router();

VoucherRouter.get("/GetLastVouher/:VoucherType", GetLastVoucher);
VoucherRouter.post("/", CreateVoucher);
VoucherRouter.get("/", GetAllVouchers);
VoucherRouter.get("/type/:VoucherType", GetVouchersByType);
VoucherRouter.get("/:id", GetVoucherById);
VoucherRouter.put("/update/:id", UpdateVoucher);
VoucherRouter.delete("/:id", DeleteVoucher);

export default VoucherRouter;
