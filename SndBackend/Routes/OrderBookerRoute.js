import express from "express";
import {
  CreateOrderBooker,
  deleteOrderBooker,
  getAllOrderBooker,
  getLastOrderBookerCode,
  PushBulkData,
  updateOrderBooker,
  updatePassword,
  OrderBookerLogin,
  OrderBookerProfile,
  getOrderBookerByDistributor,
} from "../Controllar/OrderBookerControllar.js";
const OrderBookerRouter = express.Router()


OrderBookerRouter.post('/', CreateOrderBooker )
OrderBookerRouter.put('/updateOrderBooker/:id', updateOrderBooker)
OrderBookerRouter.put('/updatePassword/:id', updatePassword)
OrderBookerRouter.get("/", getAllOrderBooker)
OrderBookerRouter.get("/lastcode", getLastOrderBookerCode)
OrderBookerRouter.delete("/deleteOrderBooker/:id", deleteOrderBooker)
OrderBookerRouter.get("/OrderByvendor/:Distributor", getOrderBookerByDistributor);
OrderBookerRouter.post("/PushBulkData" , PushBulkData)
OrderBookerRouter.post("/OrderBookerLogin3" , OrderBookerLogin)
OrderBookerRouter.post("/OrderBookerProfile" , OrderBookerProfile)

export default OrderBookerRouter