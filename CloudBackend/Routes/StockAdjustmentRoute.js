import express from "express";
import {
    createStockAdjustment,
    getAllStockAdjustment,
    updateStockAdjustment,
    deleteStockAdjustment,
    postStockAdjustment,
    createStockAdjustmentBulk
} from "../Controllar/StockAdjustmentControllar.js";

const StockAdjustmentRouter = express.Router();

StockAdjustmentRouter.post("/", createStockAdjustment);
StockAdjustmentRouter.get("/", getAllStockAdjustment);
StockAdjustmentRouter.put("/UpdateStockAdjustment/:id", updateStockAdjustment);
StockAdjustmentRouter.delete("/StockAdjustmentDelete/:id", deleteStockAdjustment);
StockAdjustmentRouter.put("/ChangeStatus/:id", postStockAdjustment);
StockAdjustmentRouter.post("/PushinBulk", createStockAdjustmentBulk);

export default StockAdjustmentRouter;
