import express from "express";
import multer from "multer";
import {
    createPhysicalVsSystemStock,
    deletePhysicalVsSystemStock,
    getAllPhysicalVsSystemStock,
    getPhysicalVsSystemStockById,
    updatePhysicalVsSystemStock,
} from "../Controllar/PhysicalVsSystemStockControllar.js";

const PhysicalVsSystemStockRouter = express.Router();

const stockImages = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 5 },
    fileFilter: (_req, file, callback) => {
        const type = file.mimetype || "";
        if (!type || type === "application/octet-stream" || type.startsWith("image/")) {
            callback(null, true);
        } else {
            callback(new Error("Only image files can be uploaded"));
        }
    },
}).array("Images", 5);

const uploadImages = (req, res, next) => {
    stockImages(req, res, (error) => {
        if (!error) return next();
        console.error(error);
        return res.status(400).send(error.message || "Image upload failed");
    });
};

PhysicalVsSystemStockRouter.post("/", uploadImages, createPhysicalVsSystemStock);
PhysicalVsSystemStockRouter.get("/", getAllPhysicalVsSystemStock);
PhysicalVsSystemStockRouter.get("/:id", getPhysicalVsSystemStockById);
PhysicalVsSystemStockRouter.put("/Update/:id", uploadImages, updatePhysicalVsSystemStock);
PhysicalVsSystemStockRouter.delete("/Delete/:id", deletePhysicalVsSystemStock);

export default PhysicalVsSystemStockRouter;
