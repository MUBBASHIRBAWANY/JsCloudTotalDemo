import express from "express";
import { getOrderBookerpaymentRcvd, OrderBookerpaymentRcvd } from "../Controllar/OrderBookerpaymentRcvd.js";

const OrderBookerpaymentRcvdRouter = express.Router()


OrderBookerpaymentRcvdRouter.post('/', OrderBookerpaymentRcvd )

OrderBookerpaymentRcvdRouter.get("/", getOrderBookerpaymentRcvd)


export default OrderBookerpaymentRcvdRouter