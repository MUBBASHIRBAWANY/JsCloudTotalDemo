import express from "express";
import { recalculateCosting, getPurchaseRates, getAvgRateReport, recalculateWithAvgRates } from "../Controllar/CostingControllar.js";

const CostingRouter = express.Router();

// Get product-wise purchase rates (preview)
CostingRouter.get("/rates", getPurchaseRates);

// Recalculate costing and recreate Co Vouchers
CostingRouter.post("/recalculate", recalculateCosting);


CostingRouter.get("/avg-rate-report", getAvgRateReport);
CostingRouter.post("/recalculate-with-rates", recalculateWithAvgRates);

export default CostingRouter;
