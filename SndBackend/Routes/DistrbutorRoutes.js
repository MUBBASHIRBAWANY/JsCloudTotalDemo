import express from "express";
import { CreateDistrbutor, DeleteDistrbutor, DistrbutorLogin, DistrbutorProfile, GetAllDistrbutor, UpdateDistrbutor } from "../Controllar/DistrbutorControllar.js";

const DistrbutorRouter = express.Router()


DistrbutorRouter.post("/", CreateDistrbutor)
DistrbutorRouter.get("/", GetAllDistrbutor)
DistrbutorRouter.post("/DistrbutorLogin" , DistrbutorLogin)
DistrbutorRouter.post("/DistrbutorProfile" , DistrbutorProfile)




export default DistrbutorRouter
