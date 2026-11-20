import express from "express";
import { createReason, getAllReason, getReasonById, updateReason, deleteReason } from "../Controllar/ReasonControllar.js";

const ReasonRouter = express.Router()

ReasonRouter.post("/", createReason)
ReasonRouter.get("/", getAllReason)
ReasonRouter.get("/:id", getReasonById)
ReasonRouter.put("/update/:id", updateReason)
ReasonRouter.delete("/delete/:id", deleteReason)

export default ReasonRouter
