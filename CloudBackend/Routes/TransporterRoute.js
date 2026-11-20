import express from "express";
import { CreateTransporter, updateTransporter, getAllTransporter, deleteTransporter, getLastTransporterCode,  PushBulkDataInTransporter,  } from "../Controllar/TrnasporterControllar.js";
const TransporterRouter = express.Router()


TransporterRouter.post('/', CreateTransporter )
TransporterRouter.put('/UpdateTransporter/:id', updateTransporter)
TransporterRouter.get("/", getAllTransporter)
TransporterRouter.get('/lastCode', getLastTransporterCode)
TransporterRouter.delete("/deleteTransporter/:id", deleteTransporter)
TransporterRouter.post("/PushBulkData", PushBulkDataInTransporter)

export default TransporterRouter