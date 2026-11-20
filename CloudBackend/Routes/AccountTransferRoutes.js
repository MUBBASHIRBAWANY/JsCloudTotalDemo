import express from "express";
import {
    createAccountTransfer,
    getAllAccountTransfers,
    getAccountTransferById,
    deleteAccountTransfer
} from "../Controllar/AccountTransferControllar.js";

const AccountTransferRouter = express.Router();

AccountTransferRouter.post("/", createAccountTransfer);
AccountTransferRouter.get("/", getAllAccountTransfers);
AccountTransferRouter.get("/:id", getAccountTransferById);
AccountTransferRouter.delete("/:id", deleteAccountTransfer);

export default AccountTransferRouter;
