import express from "express";
import { ClientWiseInvoice, createDistrbutorInvoice, deleteDistrbutorInvoice, DistrbutorInvoiceStatusUpdate, DistrbutorInvoiceUpdate, getAllDistrbutorInvoice, getDistrbutorInvoiceById, getDisInvoiceNumberWithouStatus, getInvoiceDc, getRemainInvoiceByClient, getRemainOnly, PostDistrbutorInvoice, RepostInvoice, RepostInvoiceVoucher } from "../Controllar/DistrbutorInvoiceControllar.js";


const DistrbutorInvoiceRoutes = express.Router()


DistrbutorInvoiceRoutes.post("/", createDistrbutorInvoice)
DistrbutorInvoiceRoutes.get("/getInvoiceDc", getInvoiceDc)
DistrbutorInvoiceRoutes.get("/", getAllDistrbutorInvoice)
DistrbutorInvoiceRoutes.put("/DistrbutorInvoiceUpdate/:id", DistrbutorInvoiceUpdate)
DistrbutorInvoiceRoutes.put("/DistrbutorInvoicePost/:id", PostDistrbutorInvoice)
DistrbutorInvoiceRoutes.put("/DistrbutorInvoiceStatusUpdate/:id", DistrbutorInvoiceStatusUpdate)
DistrbutorInvoiceRoutes.get("/getRemainOnly" , getRemainOnly)
DistrbutorInvoiceRoutes.get("/getRemainOnlyByClinet/:Distrbutor" , getRemainInvoiceByClient)
DistrbutorInvoiceRoutes.get("/getDisInvoiceNumber" , getDisInvoiceNumberWithouStatus)
DistrbutorInvoiceRoutes.get("/RepostInvoice" , RepostInvoice)
DistrbutorInvoiceRoutes.post("/repostVoucher", RepostInvoiceVoucher)
DistrbutorInvoiceRoutes.get("/ClientWiseInvoice" , ClientWiseInvoice)
DistrbutorInvoiceRoutes.get("/DeleteInvoice2" , deleteDistrbutorInvoice)
DistrbutorInvoiceRoutes.get("/:id", getDistrbutorInvoiceById)



export default DistrbutorInvoiceRoutes
