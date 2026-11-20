import express from "express";
import { createBank, getAllBank, getBankById, updateBank, deleteBank } from "../Controllar/BankControllar.js";

const BankRouter = express.Router()

BankRouter.post("/", createBank)
BankRouter.get("/", getAllBank)
BankRouter.get("/:id", getBankById)
BankRouter.put("/update/:id", updateBank)
BankRouter.delete("/delete/:id", deleteBank)

export default BankRouter
