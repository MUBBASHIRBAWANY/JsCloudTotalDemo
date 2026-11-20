import express from "express";
import { getCompanyPolicy, updateCompanyPolicy } from "../Controllar/CompanyPolicyControllar.js";

const CompanyPolicyRouter = express.Router()

CompanyPolicyRouter.get("/", getCompanyPolicy)
CompanyPolicyRouter.put("/", updateCompanyPolicy)

export default CompanyPolicyRouter
