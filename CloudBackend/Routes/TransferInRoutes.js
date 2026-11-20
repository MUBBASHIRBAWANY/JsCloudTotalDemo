import express from "express";
import { createTransferIn, getAllTransferIn, postTransferIn } from "../Controllar/InventoryTransferInControllar.js";
const InventoryTransferInRouter = express.Router();

InventoryTransferInRouter.get('/', getAllTransferIn);
InventoryTransferInRouter.put('/ChangeStatus/:id', postTransferIn);
InventoryTransferInRouter.post("/", createTransferIn)

export default InventoryTransferInRouter;