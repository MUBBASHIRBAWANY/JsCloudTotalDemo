import FixedAssetModal from "../Modal/FixedAssetModal.js";
import ChartofAccountsModal from "../Modal/ChartofAccountsModal.js";
import jwt from "jsonwebtoken";
import logModal from "../Modal/LogModal.js";
import { checkMonthClose } from "../utils/checkMonthClose.js";
import VoucherModal from "../Modal/VoucherModal.js";

export const createFixedAsset = async (req, res) => {
    try {
        // Agar frontend se AssetCode aa raha ho to use preserve kare,
        // warna system automatically generate kare.
        if (!req.body.AssetCode) {
            const lastAsset = await FixedAssetModal
                .findOne({ AssetCode: { $regex: /^FA-\d+$/ } })
                .sort({ AssetCode: -1 })
                .select("AssetCode");

            let nextNumber = 1;

            if (lastAsset?.AssetCode) {
                const lastNumber = Number(
                    lastAsset.AssetCode.replace("FA-", "")
                );

                nextNumber = lastNumber + 1;
            }

            req.body.AssetCode = `FA-${String(nextNumber).padStart(6, "0")}`;
        }

        // Initial book value purchase cost ke equal rahegi
        if (
            req.body.BookValue === undefined ||
            req.body.BookValue === null ||
            req.body.BookValue === ""
        ) {
            req.body.BookValue = Number(req.body.PurchaseCost || 0);
        }

        // Initial accumulated depreciation
        if (
            req.body.AccumulatedDepreciation === undefined ||
            req.body.AccumulatedDepreciation === null
        ) {
            req.body.AccumulatedDepreciation = 0;
        }

        const data = await FixedAssetModal.create(req.body);

        res.status(201).send({
            status: true,
            message: "Fixed asset created successfully",
            data
        });
    } catch (err) {
        console.log("Create Fixed Asset Error:", err);

        res.status(400).send({
            status: false,
            message: err.message || "Something went wrong"
        });
    }
};

export const getAllFixedAssets = async (req, res) => {
    try {
        const data = await FixedAssetModal.find();
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        console.log(err);
        res.status(400).send({ status: false, message: "Something went wrong" });
    }
};

export const getFixedAssetById = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await FixedAssetModal.findById(id);
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        console.log(err);
        res.status(400).send({ status: false, message: "Something went wrong" });
    }
};

export const updateFixedAsset = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await FixedAssetModal.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        console.log(err);
        res.status(400).send({ status: false, message: "Something went wrong" });
    }
};

export const deleteFixedAsset = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await FixedAssetModal.findByIdAndDelete(id);
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        console.log(err);
        res.status(400).send({ status: false, message: "Something went wrong" });
    }
};
function calculateDepreciation(asset) {
    const currentBookValue = asset.BookValue - (asset.PostedDepValue || 0);
    const salvageValue = asset.SalvageValue || 0;

    if (currentBookValue <= salvageValue) return 0;

    let depreciationAmount = 0;

    switch (asset.DepreciationMethod) {
        case "Straight Line": {
            // Annual depreciation = (PurchaseCost - SalvageValue) / UsefulLife
            // Monthly = Annual / 12
            const annual = (asset.PurchaseCost - salvageValue) / (asset.UsefulLife || 1);
            depreciationAmount = annual / 12;
            break;
        }

        case "Declining Balance": {
            // currentBookValue = BookValue - PostedDepValue
            // depreciationAmount = currentBookValue * (DepreciationRate / 100)
            depreciationAmount = currentBookValue * ((asset.DepreciationRate || 0) / 100);
            break;
        }

        case "Double Declining": {
            // Double the declining balance rate
            // depreciationAmount = currentBookValue * (2 * DepreciationRate / 100)
            depreciationAmount = currentBookValue * (2 * (asset.DepreciationRate || 0) / 100);
            break;
        }

        case "Units of Production": {
            // Uses MonthlyDepreciation if available
            depreciationAmount = asset.MonthlyDepreciation || 0;
            break;
        }

        default:
            depreciationAmount = 0;
    }

    // Depreciation cannot exceed remaining book value above salvage
    const maxAllowed = currentBookValue - salvageValue;
    if (depreciationAmount > maxAllowed) {
        depreciationAmount = maxAllowed;
    }

    // Round to 2 decimal places
    depreciationAmount = Math.round(depreciationAmount * 100) / 100;

    return depreciationAmount > 0 ? depreciationAmount : 0;
}

export const postDepreciationVoucher = async (req, res) => {
    const monthCheck = await checkMonthClose(req, res, "VoucherDate");
    if (monthCheck) return;

    try {
        const { VoucherDate } = req.body;

        if (!VoucherDate) {
            return res.status(400).send({
                status: false,
                message: "VoucherDate is required"
            });
        }

        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, "peral-Dynamic");
        const createdByUser = decoded?.val?.firstname || "unknown";

        const date = new Date(VoucherDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const monthPrefix = `${year}-${month}`;

        // ----------------------------
        // CHECK DUPLICATE FAV VOUCHER
        // ----------------------------
        const existingVoucher = await VoucherModal.findOne({
            VoucherType: "FAV",
            VoucherNumber: { $regex: `^FAV${year}${month}` }
        });

        if (existingVoucher) {
            return res.status(400).send({
                status: false,
                message: `Depreciation voucher already exists for ${monthPrefix}: ${existingVoucher.VoucherNumber}`,
                data: existingVoucher
            });
        }

        // ----------------------------
        // FIND ALL ELIGIBLE ASSETS
        // ----------------------------
        const assets = await FixedAssetModal.find({ Status: "Active" });

        if (!assets.length) {
            return res.status(400).send({
                status: false,
                message: "No active fixed assets found"
            });
        }

        // ----------------------------
        // CALCULATE DEPRECIATION
        // ----------------------------
        const depreciationEntries = [];

        for (const asset of assets) {
            // Skip if asset has no depreciation method or accounts
            if (!asset.DepreciationMethod || !asset.DepreciationAccount || !asset.AccumulatedDepreciationAccount) {
                continue;
            }

            const depreciationAmount = calculateDepreciation(asset);

            if (depreciationAmount <= 0) continue;

            depreciationEntries.push({
                asset,
                depreciationAmount
            });
        }

        if (!depreciationEntries.length) {
            return res.status(400).send({
                status: false,
                message: "No assets eligible for depreciation this month. Either all assets have reached salvage value or depreciation accounts are not configured."
            });
        }

        // ----------------------------
        // GENERATE VOUCHER NUMBER
        // ----------------------------
        const prefix = `FAV${year}${month}`;
        const lastVoucher = await VoucherModal.findOne({
            VoucherType: "FAV",
            VoucherNumber: { $regex: `^${prefix}` }
        }).sort({ VoucherNumber: -1 });

        let serial = 1;
        if (lastVoucher) {
            const serialMatch = lastVoucher.VoucherNumber.match(new RegExp(`^${prefix}(\\d+)$`));
            if (serialMatch && serialMatch[1]) {
                serial = parseInt(serialMatch[1], 10) + 1;
            }
        }

        const VoucherNumber = `${prefix}${String(serial).padStart(4, "0")}`;

        // ----------------------------
        // BUILD VOUCHER ENTRIES
        // ----------------------------
        const voucharData = [];
        let totalDebit = 0;

        for (const entry of depreciationEntries) {
            const { asset, depreciationAmount } = entry;

            // Debit entry - DepreciationAccount
            voucharData.push({
                Account: asset.DepreciationAccount,
                Debit: depreciationAmount,
                Credit: 0,
                Narration: `Depreciation for ${asset.AssetName} (${asset.AssetCode}) - ${asset.DepreciationMethod}`,
                Assets: asset._id,
                id: Date.now() + Math.random(),
                show: true
            });

            // Credit entry - AccumulatedDepreciationAccount
            voucharData.push({
                Account: asset.AccumulatedDepreciationAccount,
                Debit: 0,
                Credit: depreciationAmount,
                Narration: `Accumulated depreciation for ${asset.AssetName} (${asset.AssetCode})`,
                Assets:  asset._id,
                id: Date.now() + Math.random() + 1,
                show: true
            });

            totalDebit += depreciationAmount;
        }

        // ----------------------------
        // CREATE VOUCHER
        // ----------------------------
        const totalCredit = totalDebit;

        const voucherData = {
            VoucherType: "FAV",
            VoucherNumber,
            VoucherDate,
            VoucharData: voucharData,
            TotalDebit: String(totalDebit),
            TotalCredit: String(totalCredit),
            Remarks: `Monthly depreciation voucher for ${monthPrefix}`,
            status: "Post",
            createdBy: createdByUser,
            createDate: new Date().toISOString()
        };

        const newVoucher = await VoucherModal.create(voucherData);

        // ----------------------------
        // UPDATE ASSET FIELDS
        // ----------------------------
        const assetUpdates = [];

        for (const entry of depreciationEntries) {
            const { asset, depreciationAmount } = entry;

            const newPostedDepValue = (asset.PostedDepValue || 0) + depreciationAmount;
            const newAccumulatedDepreciation = asset.AccumulatedDepreciation + depreciationAmount;
            const newBookValue = asset.PurchaseCost - newAccumulatedDepreciation;

            await FixedAssetModal.findByIdAndUpdate(asset._id, {
                PostedDepValue: newPostedDepValue,
                AccumulatedDepreciation: newAccumulatedDepreciation,
                BookValue: newBookValue
            });

            assetUpdates.push({
                AssetCode: asset.AssetCode,
                AssetName: asset.AssetName,
                depreciationAmount,
                previousBookValue: asset.BookValue,
                newBookValue,
                previousAccumulatedDepreciation: asset.AccumulatedDepreciation,
                newAccumulatedDepreciation
            });
        }

        // ----------------------------
        // LOG
        // ----------------------------
        

        // ----------------------------
        // RESPONSE
        // ----------------------------
        return res.status(201).send({
            status: true,
            message: `Depreciation voucher ${VoucherNumber} created successfully for ${monthPrefix}`,
            data: {
                voucher: newVoucher,
                totalDebit,
                totalCredit,
                assetCount: depreciationEntries.length,
                assetUpdates
            }
        });

    } catch (err) {
        console.log("Post Depreciation Voucher Error:", err);

        if (err.name === "JsonWebTokenError") {
            return res.status(401).send({ status: false, message: "Invalid token" });
        }

        if (err.name === "TokenExpiredError") {
            return res.status(401).send({ status: false, message: "Token expired" });
        }

        if (err.code === 11000) {
            return res.status(409).send({
                status: false,
                message: "Voucher number already exists. Please try again."
            });
        }

        res.status(500).send({
            status: false,
            message: err.message || "Something went wrong while posting depreciation voucher"
        });
    }
};