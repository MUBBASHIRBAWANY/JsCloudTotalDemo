import express from "express";
import { allocateLeavesForYear, getEmployeeBalances, bulkAllocateForAll } from "../Controllar/LeaveBalanceControllar.js";

const LeaveBalanceRouter = express.Router();
LeaveBalanceRouter.post("/allocate/:empId/:year", allocateLeavesForYear);
LeaveBalanceRouter.get("/employee/:empId/:year", getEmployeeBalances);
LeaveBalanceRouter.post("/bulk-allocate/:year", bulkAllocateForAll);

export default LeaveBalanceRouter;
