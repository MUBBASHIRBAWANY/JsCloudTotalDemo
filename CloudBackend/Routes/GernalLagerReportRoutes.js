import express from "express";
import {BookerLedger, CashBook, ClientlBalance, ClientlLager, CreditorBalanceList, DebtorBalanceList, EmployeeLedgerReport, EmployeeSubLedger, GernalLager, StoreLeadger, StoreWiseClientLedger, TrailBalance, TransporterlLager, VendorLeger, VendorWiseClientLedger} from "../Controllar/GernalLagerControllar.js";
import { PeriodExpenseRevenueReport } from "../Controllar/PeriodexpenserevenuereportControllar.js";

const GernalLagerRouter = express.Router()

GernalLagerRouter.get("/", GernalLager)
GernalLagerRouter.get("/EmployeeSubLedger", EmployeeSubLedger)
GernalLagerRouter.get("/EmployeeLedgerReport", EmployeeLedgerReport)
GernalLagerRouter.get("/TrailBalance", TrailBalance)
GernalLagerRouter.get("/ClientlLager", ClientlLager)
GernalLagerRouter.get("/TransporterlLager", TransporterlLager)
GernalLagerRouter.get("/ClientlBalance", ClientlBalance)
GernalLagerRouter.get("/VendorLager", VendorLeger)
GernalLagerRouter.get("/DebtorBalance", DebtorBalanceList)
GernalLagerRouter.get("/CreditorBalance", CreditorBalanceList)
GernalLagerRouter.get("/StoreLeadger", StoreLeadger)
GernalLagerRouter.get("/BookerLedger", BookerLedger)
GernalLagerRouter.get("/VendorWiseClientLedger", VendorWiseClientLedger)
GernalLagerRouter.get("/StoreWiseClientLedger", StoreWiseClientLedger)
GernalLagerRouter.get("/CashBook", CashBook)
GernalLagerRouter.get("/UnClaimed/:Bank", CashBook)
GernalLagerRouter.get("/PeriodExpenseRevenueReport", PeriodExpenseRevenueReport)


export default GernalLagerRouter