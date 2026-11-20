import express from "express";
import { ChqReports, CustomerChq, deletetCustomerChq, getChqNumberData, getCustomerChq, getOnlyUnused, RealizeCustomerChq, rejectCustomerChq, updateChqDate, updateCustomerChq, upDateCustomerChqStatus } from "../Controllar/CustomerChqRecivedControllars.js";

const CustomerChqRecivedRouter = express.Router();



CustomerChqRecivedRouter.post('/', CustomerChq)
CustomerChqRecivedRouter.get("/" , getCustomerChq)
CustomerChqRecivedRouter.put('/updatecustomer/:id', updateCustomerChq)
CustomerChqRecivedRouter.put('/upDateCustomerChq/:id' , upDateCustomerChqStatus)
CustomerChqRecivedRouter.delete("/delete/:id", deletetCustomerChq)
CustomerChqRecivedRouter.get("/getChq/:chq" , getChqNumberData)
CustomerChqRecivedRouter.get("/Allunused" , getOnlyUnused)
CustomerChqRecivedRouter.post("/RealizeCustomerChq" , RealizeCustomerChq)
CustomerChqRecivedRouter.get("/ChqReports" , ChqReports)
CustomerChqRecivedRouter.put("/updateChqDate" , updateChqDate)
CustomerChqRecivedRouter.put("/rejectCustomerChq/:id" , rejectCustomerChq)

export default CustomerChqRecivedRouter
