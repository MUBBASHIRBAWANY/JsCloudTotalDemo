import mongoose from "mongoose";

const SlabRowSchema = new mongoose.Schema({
  from: {
    type: Number,
    required: true,
  },
  to: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
  },
}, { _id: false });

const SlabSchema = new mongoose.Schema({
  priceList: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PriceList",
    required: true,
    
  },
  fromAmount: {
    type: Number,
    required: true,
  },
  toAmount: {
    type: Number,
    required: true,
  },
  maxPercentage: {
    type: Number,
    required: true,
  },
  slabRows: {
    type: [SlabRowSchema],
    default: [],
  },
  status: {
    type: String,
    enum: ["Active", "InActive"],
    default: "Active",
  },
}, {
  timestamps: true,
});

const SlabModal = mongoose.model("Slab", SlabSchema);
export default SlabModal;
