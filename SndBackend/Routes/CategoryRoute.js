import express from "express";
import { CreateCategory, getAllCategory } from "../Controllar/CategoryControllar.js";

const CategoryRouter = express.Router()


CategoryRouter.post('/', CreateCategory )
CategoryRouter.get("/", getAllCategory)

export default CategoryRouter