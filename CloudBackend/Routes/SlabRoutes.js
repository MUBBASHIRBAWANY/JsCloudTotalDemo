import express from "express";
import {
  CreateSlab,
  GetAllSlabs,
  GetSlabById,
  UpdateSlab,
  DeleteSlab,
  CheckPriceListSlab,
} from "../Controllar/SlabControllar.js";

const SlabRouter = express.Router();

SlabRouter.get("/", GetAllSlabs);
SlabRouter.get("/:id", GetSlabById);
SlabRouter.get("/check/:priceListId", CheckPriceListSlab);
SlabRouter.post("/", CreateSlab);
SlabRouter.put("/:id", UpdateSlab);
SlabRouter.delete("/:id", DeleteSlab);

export default SlabRouter;
