import express from "express";
import { CreateZone, updateZone, getAllZone, deleteZone, getLastZoneCode,  PushBulkDataInZone,  } from "../Controllar/ZoneControllar.js";
const ZoneRouter = express.Router()


ZoneRouter.post('/', CreateZone )
ZoneRouter.put('/UpdateZone/:id', updateZone)
ZoneRouter.get("/", getAllZone)
ZoneRouter.get('/lastCode', getLastZoneCode)
ZoneRouter.delete("/deleteZone/:id", deleteZone)
ZoneRouter.post("/PushBulkData", PushBulkDataInZone)

export default ZoneRouter