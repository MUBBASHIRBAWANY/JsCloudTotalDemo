import express from "express";
import { CreateSaleOrderDC} from "../Controllar/SaleOrderDcControllar.js";
const SaleOrderDcRouter = express.Router()


SaleOrderDcRouter.post('/', CreateSaleOrderDC )


export default SaleOrderDcRouter