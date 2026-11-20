import express from "express";
import { CreateMasterSKu, getAllMasterSKu } from "../Controllar/MasterSKuControllar.js";

const MasterSkuRouter = express.Router()


MasterSkuRouter.post('/', CreateMasterSKu )
MasterSkuRouter.get("/", getAllMasterSKu)

export default MasterSkuRouter