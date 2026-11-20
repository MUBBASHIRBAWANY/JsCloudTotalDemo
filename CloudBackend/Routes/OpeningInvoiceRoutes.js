
import { CreateOpeningInvoice, getAllOpeningInvoices, updateOpeningInvoice,deleteOpeningInvoice, AllOpeningRemainInvoices} from "../Controllar/OpeningInvoiceControllar.js";
import { Router } from "express";


const OpeningInvoiceRoutes = Router();  

OpeningInvoiceRoutes.get('/' , getAllOpeningInvoices)
OpeningInvoiceRoutes.post("/" , CreateOpeningInvoice)
OpeningInvoiceRoutes.put('/updateOpening/:id' , updateOpeningInvoice)
OpeningInvoiceRoutes.delete("/Deleteopening/:id" , deleteOpeningInvoice)
OpeningInvoiceRoutes.get("/onlyRemain" , AllOpeningRemainInvoices)


export default OpeningInvoiceRoutes