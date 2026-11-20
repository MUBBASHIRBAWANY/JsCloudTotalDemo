import mongoose from "mongoose";

const StockAdjustmentSchema = new mongoose.Schema(
  {
    Distrbutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distrbutor",
      required: true,
    },
    Adjustments: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        adjustmentType: {
          type: String,
          enum: ["Add", "Less"],
          required: true,
        },
        Box: {
          type: Number,
          required: true,
        },
        Carton: {
          type: Number,
          default: 0,
        },
        Unit: {
          type: Number,
          default: 0,
        },
      },
    ],
    AdjustmentDate: {
      type: String,
      required: true,
    },
    Reason: {
      type: String,
      default: "",
    },
    CreatedBy: {
      type: String,
      default: "admin@js.com",
    },
    isPosted: {
      type: Boolean,
      default: false,
    },
    PostedAt: {
      type: Date,
      default: null,
    },
    PostedBy: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const StockAdjustmentModal = mongoose.model(
  "StockAdjustment",
  StockAdjustmentSchema
);

export default StockAdjustmentModal;
