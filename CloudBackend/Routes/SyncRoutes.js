import express from "express";
import {
  PushPriceListToSND,
  PushAllPriceListsToSND,
  PushSlabToSND,
  PushAllSlabsToSND,
} from "../Controllar/SyncControllar.js";

const SyncRouter = express.Router();

// PriceList sync
SyncRouter.post("/price-list/:id", PushPriceListToSND);
SyncRouter.post("/price-list/all", PushAllPriceListsToSND);

// Slab sync
SyncRouter.post("/slab/:id", PushSlabToSND);
SyncRouter.post("/slab/all", PushAllSlabsToSND);

export default SyncRouter;
