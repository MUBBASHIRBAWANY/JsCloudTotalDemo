
import express from "express";
import { CreditRealize } from "../Controllar/RealizeControllar.js";

const RealizeRouter = express.Router()
RealizeRouter.post('/CreditRealize', CreditRealize)
export default RealizeRouter