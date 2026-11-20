import express from "express";
import {
    getDashboard,
    getPayslips,
    getPayslipById,
    getAttendanceSummary,
    getLoans,
    updateContact
} from "../Controllar/ESSControllar.js";
import { hrmsBody } from "../utils/hrmsError.js";

const ESSRouter = express.Router();

/**
 * Middleware: ensure every ESS request has an authenticated employee identity.
 * Every route checks req.user.employeeId; cross-employee access returns HTTP 403.
 * Requirements 3.1, 3.10
 */
ESSRouter.use((req, res, next) => {
    if (!req.user || !req.user.employeeId) {
        return res.status(403).json(hrmsBody("Sign in required", "Sign in with an employee account to use self-service."));
    }
    next();
});

// GET /HrESS/dashboard — dashboard summary for authenticated employee (Req 3.2)
ESSRouter.get("/dashboard", getDashboard);

// GET /HrESS/payslips — paginated payslip list (Req 3.3)
ESSRouter.get("/payslips", getPayslips);

// GET /HrESS/payslips/:id — single payslip detail (Req 3.4)
ESSRouter.get("/payslips/:id", getPayslipById);

// GET /HrESS/attendance — monthly attendance summary (Req 3.7)
ESSRouter.get("/attendance", getAttendanceSummary);

// GET /HrESS/loans — active loans (Req 3.8)
ESSRouter.get("/loans", getLoans);

// PUT /HrESS/contact — update contact fields (Req 3.9)
ESSRouter.put("/contact", updateContact);

export default ESSRouter;
