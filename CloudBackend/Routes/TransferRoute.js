import express from "express";
import { transferEmployee, getTransferHistory } from "../Controllar/TransferControllar.js";

const TransferRouter = express.Router()

TransferRouter.post("/transfer", transferEmployee)
TransferRouter.get("/history/:empId", getTransferHistory)

export default TransferRouter
