import mongoose from "mongoose";

const AdvanceDiscountPolicySchema = new mongoose.Schema({
  value: { type: Number, default: 0 },
  label: { type: String, default: "" },
  Status: { type: String, default: "Active" },
}, { timestamps: true });

const AdvanceDiscountPolicyModal = mongoose.model("AdvanceDiscountPolicy", AdvanceDiscountPolicySchema);
export default AdvanceDiscountPolicyModal;
