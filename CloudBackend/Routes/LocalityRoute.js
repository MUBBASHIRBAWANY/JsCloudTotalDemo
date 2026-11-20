import express from "express";
import { CreateLocality, deleteLocality, getAllLocality, getLastLocalityCodeByVendor, PushBulkDataInLocality, updateLocality } from "../Controllar/LocalityControllar.js";

const LocalityRouter = express.Router()


LocalityRouter.get("/", getAllLocality)
LocalityRouter.post("/" , CreateLocality)
LocalityRouter.put("/updateLocality/:id", updateLocality)
LocalityRouter.get("/getLastByVendor/:vendor", getLastLocalityCodeByVendor)
LocalityRouter.delete("/deleteLocality/:id", deleteLocality)
LocalityRouter.post("/AddInBulk", PushBulkDataInLocality)



export default LocalityRouter
