import express from "express";
import { CreatePaymentRecived, getAllPaymentRecipt, getPaymentRecipt, getPaymentReciptByMainAccounts, getPaymentReciptNumvoucher, PaymentReciptReport, PostPaymentRecipt, RejectVoucher, UpdatePaymentRecived } from "../Controllar/PaymentReciptControllar.js";


const PaymentRecivedRouter = express.Router()


PaymentRecivedRouter.post('/', CreatePaymentRecived )
PaymentRecivedRouter.get("/", getPaymentRecipt)
PaymentRecivedRouter.get("/getPaymentReciptNumvoucher", getPaymentReciptNumvoucher)
PaymentRecivedRouter.get("/ByAccounts/:Account", getPaymentReciptByMainAccounts)
PaymentRecivedRouter.put("/UpdatePayment/:id", UpdatePaymentRecived)
PaymentRecivedRouter.put("/voucherPost/:id", PostPaymentRecipt )
PaymentRecivedRouter.put("/RejectVoucher/:id", RejectVoucher )
PaymentRecivedRouter.get("/getAllPaymentRecipt", getAllPaymentRecipt )
PaymentRecivedRouter.get("/PaymentReciptReport", PaymentReciptReport )


export default PaymentRecivedRouter