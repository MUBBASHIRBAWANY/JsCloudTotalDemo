import express from "express";
import { createReligion, getAllReligion, getReligionById, updateReligion, deleteReligion } from "../Controllar/ReligionControllar.js";

const ReligionRouter = express.Router()

ReligionRouter.post("/", createReligion)
ReligionRouter.get("/", getAllReligion)
ReligionRouter.get("/:id", getReligionById)
ReligionRouter.put("/update/:id", updateReligion)
ReligionRouter.delete("/delete/:id", deleteReligion)

export default ReligionRouter
