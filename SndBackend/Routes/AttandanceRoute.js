import express from "express";
import multer from "multer";
import {
  CreateAttandance,
  getAllAttandance,
  getTodayAttandance,
} from "../Controllar/AttandanceControllar.js";

const AttandanceRouter = express.Router();

const attendanceImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const type = file.mimetype || "";
    if (!type || type === "application/octet-stream" || type.startsWith("image/")) callback(null, true);
    else callback(new Error("Only image files can be uploaded"));
  },
}).single("image");

const uploadImage = (req, res, next) => {
  attendanceImage(req, res, (error) => {
    if (!error) return next();
    console.error(error);
    res.status(400).send(error.message || "Image upload failed");
  });
};

AttandanceRouter.post("/", uploadImage, CreateAttandance);
AttandanceRouter.get("/", getAllAttandance);
AttandanceRouter.get("/today", getTodayAttandance);

export default AttandanceRouter;
