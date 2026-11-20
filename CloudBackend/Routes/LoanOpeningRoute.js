import express from "express";
import {
    getAllLoanOpening,
    getLoanOpeningById,
    createLoanOpening,
    updateLoanOpening,
    deleteLoanOpening
} from "../Controllar/LoanOpeningControllar.js";

const LoanOpeningRouter = express.Router();

LoanOpeningRouter.get("/", getAllLoanOpening);
LoanOpeningRouter.get("/:id", getLoanOpeningById);
LoanOpeningRouter.post("/", createLoanOpening);
LoanOpeningRouter.put("/updateLoanOpening/:id", updateLoanOpening);
LoanOpeningRouter.delete("/deleteLoanOpening/:id", deleteLoanOpening);

export default LoanOpeningRouter;
