import express from "express";
import {
  createStockAdjustment,
  getAllStockAdjustments,
  getStockAdjustmentsByDistributor,
  getStockAdjustmentsForReport,
  getStockAdjustmentById,
  updateStockAdjustment,
  deleteStockAdjustment,
  postStockAdjustment,
} from "../Controllar/StockAdjustmentControllar.js";

const StockAdjustmentRouter = express.Router();

StockAdjustmentRouter.post("/", createStockAdjustment);
StockAdjustmentRouter.get("/", getAllStockAdjustments);
StockAdjustmentRouter.get("/ByDistributor/:Distrbutor", getStockAdjustmentsByDistributor);
StockAdjustmentRouter.get("/Report", getStockAdjustmentsForReport);
StockAdjustmentRouter.get("/:id", getStockAdjustmentById);
StockAdjustmentRouter.put("/:id", updateStockAdjustment);
StockAdjustmentRouter.delete("/Delete/:id", deleteStockAdjustment);
StockAdjustmentRouter.put("/Post/:id", postStockAdjustment);

export default StockAdjustmentRouter;
