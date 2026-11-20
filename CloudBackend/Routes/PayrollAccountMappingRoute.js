import express from "express";
import { getMapping, upsertMapping } from "../Controllar/PayrollAccountMappingControllar.js";

const PayrollAccountMappingRouter = express.Router();
PayrollAccountMappingRouter.get("/", getMapping);
PayrollAccountMappingRouter.put("/", upsertMapping);

export default PayrollAccountMappingRouter;
