import express from "express";
import multer from "multer";
import {
  CreateSaleOrder,
  deleteSaleOrder,
  getAllSaleOrder,
  getAllSaleOrderBYDistrbutor,
  getDataByOrderBooker,
  getLastSaleOrderCode,
  getSaleOrder,
  getSaleOrderDaySummary,
  getSaleOrderDayTrend,
  getSalesOrderByNumber,
  MobileCreateSaleOrder,
  updateOrderStatus,
  updateSaleOrder,
} from "../Controllar/SaleOrderControllar.js";

const SaleOrderRouter = express.Router();

const orderUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 8 },
}).any();

const parseMobileOrder = (req, res, next) => {
  orderUpload(req, res, (error) => {
    if (!error) return next();
    console.error(error);
    res.status(400).send({ status: false, message: error.message || "Upload failed" });
  });
};

SaleOrderRouter.post("/", CreateSaleOrder);
SaleOrderRouter.put("/updateSaleOrder/:id", updateSaleOrder);
SaleOrderRouter.get("/", getAllSaleOrder);
SaleOrderRouter.get("/saleOrderByDis/:Distributor", getAllSaleOrderBYDistrbutor);
SaleOrderRouter.get("/lastcode", getLastSaleOrderCode);
SaleOrderRouter.delete("/deleteSaleOrder/:id", deleteSaleOrder);
SaleOrderRouter.put("/ChangeStatus/:id", updateOrderStatus);
SaleOrderRouter.get("/getDataByOrderBooker/:OrderBooker", getDataByOrderBooker);
SaleOrderRouter.get("/getDataByBookerAndDate", getSaleOrder);
SaleOrderRouter.get("/daySummary", getSaleOrderDaySummary);
SaleOrderRouter.get("/dayTrend", getSaleOrderDayTrend);
SaleOrderRouter.post("/MobileCreateSaleOrder", parseMobileOrder, MobileCreateSaleOrder);
SaleOrderRouter.get("/getSalesOrderByNumber/:OrderNumber", getSalesOrderByNumber);

export default SaleOrderRouter;
