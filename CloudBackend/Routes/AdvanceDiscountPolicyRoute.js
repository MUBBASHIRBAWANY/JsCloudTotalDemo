import express from "express";
import { getAllAdvanceDiscountPolicy } from "../Controllar/AdvanceDiscountPolicyControllar.js";

const AdvanceDiscountPolicyRouter = express.Router();

AdvanceDiscountPolicyRouter.get("/", getAllAdvanceDiscountPolicy);

export default AdvanceDiscountPolicyRouter;
