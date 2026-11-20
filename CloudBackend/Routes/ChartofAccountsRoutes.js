import express from "express";
import { checkAccountBalance, CreateChartofAccounts,  deleteChartofAccounts, getAllChartofAccounts,  getONlyStage4,  toggleAccountStatus,  updateChartofAccounts } from "../Controllar/ChartofAccountsControllars.js";


export  const ChartofAccountsROuter = express.Router()

ChartofAccountsROuter.post('/', CreateChartofAccounts)
ChartofAccountsROuter.get('/', getAllChartofAccounts)
ChartofAccountsROuter.put('/updatChartofAccounts/:id', updateChartofAccounts)
ChartofAccountsROuter.delete('/deletChartofAccounts/:id', deleteChartofAccounts)
ChartofAccountsROuter.get("/Stage4", getONlyStage4)

ChartofAccountsROuter.put("/toggleStatus/:id", toggleAccountStatus)
ChartofAccountsROuter.get("/checkBalance/:id", checkAccountBalance)