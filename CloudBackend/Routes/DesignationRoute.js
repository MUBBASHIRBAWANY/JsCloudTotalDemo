import express from "express";
import { CreateDesignation, getAllDesignation, getDesignationById, updateDesignation, deleteDesignation, getDesignationByDepartment, getDesignationNameId } from "../Controllar/DesignationControllar.js";

const DesignationRouter = express.Router()

DesignationRouter.post("/", CreateDesignation)
DesignationRouter.get("/", getAllDesignation)
DesignationRouter.get("/getDesignationNameId", getDesignationNameId)
DesignationRouter.get("/getDesignationByDepartment/:deptId", getDesignationByDepartment)
DesignationRouter.get("/:id", getDesignationById)
DesignationRouter.put("/updateDesignation/:id", updateDesignation)
DesignationRouter.delete("/deleteDesignation/:id", deleteDesignation)

export default DesignationRouter
