import express from "express";
import {
    getAllEBFOpening,
    createEBFOpening,
    updateEBFOpening,
    deleteEBFOpening
} from "../Controllar/EBFOpeningBalanceControllar.js";

const EBFOpeningRouter = express.Router();

EBFOpeningRouter.get("/", getAllEBFOpening);
EBFOpeningRouter.post("/", createEBFOpening);
EBFOpeningRouter.put("/updateEBFOpening/:id", updateEBFOpening);
EBFOpeningRouter.delete("/deleteEBFOpening/:id", deleteEBFOpening);

export default EBFOpeningRouter;
