import express from "express";
import {
    createCycle,
    updateCycle,
    assignKPI,
    recordKPIScore,
    getConsolidatedReview,
    submit360Feedback,
    createIncrementProposal,
    approveIncrement,
    exportCycleResults,
} from "../Controllar/PerformanceControllar.js";

const PerformanceRouter = express.Router();

// Appraisal Cycle
PerformanceRouter.post("/cycle", createCycle);
PerformanceRouter.put("/cycle/:id", updateCycle);

// KPI
PerformanceRouter.post("/kpi", assignKPI);
PerformanceRouter.put("/kpi/:id/score", recordKPIScore);

// 360 Feedback
PerformanceRouter.post("/feedback", submit360Feedback);

// Consolidated review card
PerformanceRouter.get("/review/:empId/:cycleId", getConsolidatedReview);

// Salary Increment Proposals
PerformanceRouter.post("/increment", createIncrementProposal);
PerformanceRouter.put("/increment/:id/approve", approveIncrement);

// Export cycle results (JSON default, ?format=csv for CSV)
PerformanceRouter.get("/export/:cycleId", exportCycleResults);

export default PerformanceRouter;
