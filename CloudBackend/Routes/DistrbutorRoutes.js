import express from "express";
import { BulkDistrbutorAdd, CreateDistrbutor, DeleteDistrbutor, DistrbutorByOrderBooker, DistrbutorNameId, GetAllDistrbutor, UpdateDistrbutor } from "../Controllar/DistrbutorControllar.js";

const DistrbutorRouter = express.Router()


DistrbutorRouter.post("/", CreateDistrbutor)
DistrbutorRouter.get("/", GetAllDistrbutor)
DistrbutorRouter.get("/DistrbutorNameId", DistrbutorNameId)
DistrbutorRouter.put("/UpdateDistrbutor/:id", UpdateDistrbutor)
DistrbutorRouter.delete("/deleteDistrbutor/:id", DeleteDistrbutor)
DistrbutorRouter.post("/AddInBulk" , BulkDistrbutorAdd)
DistrbutorRouter.get("/DistrbutorByOrderBooker/:OrderBooker", DistrbutorByOrderBooker);



export default DistrbutorRouter
