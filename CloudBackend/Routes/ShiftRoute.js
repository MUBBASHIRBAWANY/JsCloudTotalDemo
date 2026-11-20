import express from "express";
import {
    createShift,
    getAllShifts,
    updateShift,
    assignShiftToEmployee
} from "../Controllar/ShiftControllar.js";
import { getShiftHistory } from "../engine/ShiftResolver.js";
import { hrmsCatch } from "../utils/hrmsError.js";


const ShiftRouter = express.Router();

ShiftRouter.post("/", createShift);
ShiftRouter.get("/", getAllShifts);
ShiftRouter.get("/history/:empId", async (req, res) => {
    try {
        const data = await getShiftHistory(req.params.empId);
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Shift history failed", "Shift history could not be loaded. Please try again.");
    }
});
ShiftRouter.put("/:id", updateShift);
ShiftRouter.put("/:id/assign/:empId", assignShiftToEmployee);

export default ShiftRouter;
