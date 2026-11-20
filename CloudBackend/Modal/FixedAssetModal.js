import mongoose from "mongoose";

const FixedAssetSchema = new mongoose.Schema(
    {
        AssetName: {
            type: String,
            required: true,
            trim: true
        },

        AssetCode: {
            type: String,
            unique: true,
            trim: true
        },

        AssetCategory: {
            type: String
        },

        Description: {
            type: String
        },

        Location: {
            type: String
        },

        Store: {
            type: String
        },

        SerialNumber: {
            type: String
        },

        Model: {
            type: String
        },

        Manufacturer: {
            type: String
        },

        Condition: {
            type: String,
            enum: ["New", "Good", "Fair", "Poor"],
            default: "New"
        },

        Status: {
            type: String,
            enum: ["Active", "Inactive", "Disposed"],
            default: "Active"
        },

        PurchaseCost: {
            type: Number,
            required: true,
            default: 0
        },

        PurchaseDate: {
            type: Date,
            required: true
        },

        SalvageValue: {
            type: Number,
            default: 0
        },

        UsefulLife: {
            type: Number,
            default: 0
        },

        DepreciationMethod: {
            type: String,
            enum: [
                "Straight Line",
                "Declining Balance",
                "Double Declining",
                "Units of Production"
            ]
        },

        DepreciationRate: {
            type: Number,
            default: 0
        },

        AnnualDepreciation: {
            type: Number,
            default: 0
        },

        MonthlyDepreciation: {
            type: Number,
            default: 0
        },

        DepreciationAccount: {
            type: String
        },

        AccumulatedDepreciationAccount: {
            type: String
        },

        AccumulatedDepreciation: {
            type: Number,
            default: 0
        },

        BookValue: {
            type: Number,
            default: 0
        },

        Vendor: {
            type: String
        },

        PurchaseOrderNo: {
            type: String
        },

        InvoiceNumber: {
            type: String
        },

        WarrantyStartDate: {
            type: Date
        },

        WarrantyEndDate: {
            type: Date
        },

        InsurancePolicyNo: {
            type: String
        },

        InsuranceExpiry: {
            type: Date
        },

        LastMaintenanceDate: {
            type: Date
        },

        NextMaintenanceDate: {
            type: Date
        },

        Remarks: {
            type: String
        },
        PostedDepValue : {
            type: Number
        }
    },
    { timestamps: true }
);

const FixedAssetModal = mongoose.model("FixedAsset", FixedAssetSchema);

export default FixedAssetModal;