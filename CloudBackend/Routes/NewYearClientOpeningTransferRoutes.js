import express from "express";
import {
    generateNewYearOpeningTransfer,
    getAllNewYearOpeningTransfer,
    deleteNewYearOpeningTransfer,
    transferVoucher
} from "../Controllar/NewYearClientOpeningTransferControllar.js";

const NewYearClientOpeningTransferRouter = express.Router();

NewYearClientOpeningTransferRouter.post("/", generateNewYearOpeningTransfer);
NewYearClientOpeningTransferRouter.get("/", getAllNewYearOpeningTransfer);
NewYearClientOpeningTransferRouter.delete("/delete/:id", deleteNewYearOpeningTransfer);
NewYearClientOpeningTransferRouter.post("/transfer", transferVoucher);

export default NewYearClientOpeningTransferRouter;
