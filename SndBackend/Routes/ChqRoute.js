import express from "express";
import { changeChqStatus, CreatCash, CreateChq, getcustomerChq, getPendingcustomerChq } from "../Controllar/ChqControllar.js";

const customerChqRouter = express.Router()


customerChqRouter.get("/:Distrbutor", getPendingcustomerChq)
customerChqRouter.get("/", getcustomerChq)
customerChqRouter.post("/" , CreateChq)
customerChqRouter.post("/CreatCash" , CreatCash)
customerChqRouter.put("/Custumer/:id" , changeChqStatus)




export default customerChqRouter
