import express from "express";
import { CreateDitriButorOrderBooker, createOrderByOrderBooker, deleteDitriButorOrderBooker, getAllDitriButorOrderBooker, getLastDitriButorOrderBooker, getLastDitriButorOrderBookerCode, loginOrderBooker, orderBookerProfile, PushBulkData, updateDitriButorOrderBooker, updatePassword } from "../Controllar/DitriButorOrderBookerControllar.js";
const DitriButorOrderBookerRouter = express.Router()


DitriButorOrderBookerRouter.post('/', CreateDitriButorOrderBooker )
DitriButorOrderBookerRouter.put('/updateDitriButorOrderBooker/:id', updateDitriButorOrderBooker)
DitriButorOrderBookerRouter.get("/", getAllDitriButorOrderBooker)
DitriButorOrderBookerRouter.get("/lastcode", getLastDitriButorOrderBookerCode)
DitriButorOrderBookerRouter.delete("/deleteDitriButorOrderBooker/:id", deleteDitriButorOrderBooker)
DitriButorOrderBookerRouter.get("/getLastDitriButorOrderBooker", getLastDitriButorOrderBooker);
DitriButorOrderBookerRouter.post("/PushBulkData" , PushBulkData)
// DitriButorOrderBookerRouter.post("/login" , loginOrderBooker)
DitriButorOrderBookerRouter.post("/login2" , loginOrderBooker)
DitriButorOrderBookerRouter.post("/profile" , orderBookerProfile)
DitriButorOrderBookerRouter.post("/order" , createOrderByOrderBooker)
DitriButorOrderBookerRouter.put("/updatePassword/:id" , updatePassword)

export default DitriButorOrderBookerRouter