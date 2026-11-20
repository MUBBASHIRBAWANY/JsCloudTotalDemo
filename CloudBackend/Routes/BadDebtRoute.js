import express from "express";
import {
    createBadDebt,
    getAllBadDebt,
    getBadDebtById,
    updateBadDebt,
    deleteBadDebt
} from "../Controllar/BadDebtControllar.js";

const BadDebtRouter = express.Router();

BadDebtRouter.post("/", createBadDebt);
BadDebtRouter.get("/", getAllBadDebt);
BadDebtRouter.get("/:id", getBadDebtById);
BadDebtRouter.put("/updateBadDebt/:id", updateBadDebt);
BadDebtRouter.delete("/deleteBadDebt/:id", deleteBadDebt);

export default BadDebtRouter;
