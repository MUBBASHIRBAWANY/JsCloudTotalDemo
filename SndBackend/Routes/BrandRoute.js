import express from "express";
import { CreateBrand, getAllBrand } from "../Controllar/BrandControllar.js";

const BrandRouter = express.Router()


BrandRouter.post('/', CreateBrand )
BrandRouter.get("/", getAllBrand)


export default BrandRouter