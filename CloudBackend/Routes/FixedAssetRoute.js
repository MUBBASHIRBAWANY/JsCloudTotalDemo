import express from "express";
import {
    createFixedAsset,
    getAllFixedAssets,
    getFixedAssetById,
    updateFixedAsset,
    deleteFixedAsset,
    postDepreciationVoucher
} from "../Controllar/FixedAssetControllar.js";

const FixedAssetRouter = express.Router();

FixedAssetRouter.get("/", getAllFixedAssets);
FixedAssetRouter.post("/", createFixedAsset);
FixedAssetRouter.get("/:id", getFixedAssetById);
FixedAssetRouter.put("/:id", updateFixedAsset);
FixedAssetRouter.post("/postDepreciation", postDepreciationVoucher);
FixedAssetRouter.delete("/:id", deleteFixedAsset);

export default FixedAssetRouter;
