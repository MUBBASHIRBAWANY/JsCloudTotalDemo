import express from "express";
import multer from "multer";
import { CancelOrder, CleareDistributor, cleareOrder, createDistributorSaleOrder, GetAllDistributorSaleOrder, GetRemarks, getDistributorDaySummary, getDistributorDayTrend, getSaleOrderById, getSaleOrderList, getVisitReport, updateVisitAddress, UpdateOrder, UpdateOrderStatus, UpdateOrderStatusByNumber } from "../Controllar/DistributorSaleOrderControllar.js";
import { getOrderQtyReport } from "../Controllar/DocumentQtyReportControllar.js";

const DistributorSaleOrderRouter = express.Router()

const distributorImages = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 3 },
    fileFilter: (_req, file, callback) => {
        const type = file.mimetype || "";
        if (!type || type === "application/octet-stream" || type.startsWith("image/")) callback(null, true);
        else callback(new Error("Only image files can be uploaded"));
    },
}).array("Images", 3);
const uploadImages = (req, res, next) => {
    distributorImages(req, res, (error) => {
        if (!error) return next();
        console.error(error);
        res.status(400).send(error.message || "Image upload failed");
    });
};

DistributorSaleOrderRouter.get("/daySummary", getDistributorDaySummary)
DistributorSaleOrderRouter.get("/dayTrend", getDistributorDayTrend)
DistributorSaleOrderRouter.post("/", uploadImages, createDistributorSaleOrder)
DistributorSaleOrderRouter.get("/report", getOrderQtyReport)
DistributorSaleOrderRouter.get("/", GetAllDistributorSaleOrder)
DistributorSaleOrderRouter.get("/GetCleareOrder", cleareOrder)
DistributorSaleOrderRouter.get("/GetCleareOrder", cleareOrder)
DistributorSaleOrderRouter.put("/updateSaleOrder/:id" , UpdateOrder)
DistributorSaleOrderRouter.put("/CleareOrder/:OrderCode" , CleareDistributor)
DistributorSaleOrderRouter.put("/UpdateOrderStatusByNumber/:OrderCode" , UpdateOrderStatusByNumber)
DistributorSaleOrderRouter.put("/CancelOrder", CancelOrder)
DistributorSaleOrderRouter.get("/getRemarks/:Order" , GetRemarks)
DistributorSaleOrderRouter.get("/visitReport", getVisitReport)
DistributorSaleOrderRouter.put("/updateVisitAddress/:id", updateVisitAddress)
DistributorSaleOrderRouter.put("/UpdateOrderStatus/:id" , UpdateOrderStatus)
DistributorSaleOrderRouter.get("/list", getSaleOrderList)
DistributorSaleOrderRouter.get("/:id", getSaleOrderById)



export default DistributorSaleOrderRouter
