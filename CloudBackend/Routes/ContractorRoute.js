import express from "express";
import { createContractor, getAllContractor, getContractorById, updateContractor, deleteContractor } from "../Controllar/ContractorControllar.js";

const ContractorRouter = express.Router()

ContractorRouter.post("/", createContractor)
ContractorRouter.get("/", getAllContractor)
ContractorRouter.get("/:id", getContractorById)
ContractorRouter.put("/update/:id", updateContractor)
ContractorRouter.delete("/delete/:id", deleteContractor)

export default ContractorRouter
