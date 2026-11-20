import express from "express";
import { CreateDitriButorZSM, deleteDitriButorZSM, getAllDitriButorZSM, getLastDitriButorZSM, getLastDitriButorZSMCode, loginZSM, PushBulkData, updateDitriButorZSM, updatePassword } from "../Controllar/DitriButorZSMConstrollar.js";
const DitriButorZSMRouter = express.Router()


DitriButorZSMRouter.post('/', CreateDitriButorZSM )
DitriButorZSMRouter.put('/updateDitriButorZSM/:id', updateDitriButorZSM)
DitriButorZSMRouter.get("/", getAllDitriButorZSM)
DitriButorZSMRouter.get("/lastcode", getLastDitriButorZSMCode)
DitriButorZSMRouter.delete("/deleteDitriButorZSM/:id", deleteDitriButorZSM)
DitriButorZSMRouter.get("/getLastDitriButorZSM", getLastDitriButorZSM);
DitriButorZSMRouter.post("/PushBulkData" , PushBulkData)
// DitriButorZSMRouter.post("/login" , loginZSM)
DitriButorZSMRouter.post("/login2" , loginZSM)
DitriButorZSMRouter.put("/updatePassword/:id" , updatePassword)

export default DitriButorZSMRouter