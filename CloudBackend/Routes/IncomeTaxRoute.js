import express from "express";
import { getTaxChallan } from "../Controllar/IncomeTaxControllar.js";

const IncomeTaxRouter = express.Router()

IncomeTaxRouter.get("/challan", getTaxChallan)

export default IncomeTaxRouter
