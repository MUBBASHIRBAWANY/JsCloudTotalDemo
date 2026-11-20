import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    module: { type: String, enum: ["attendance", "leave", "payroll", "accounting", "inventory", "crm", "purchase", "sales"], required: true },
    referenceType: { type: String, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: "" },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date }
}, { timestamps: true });

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

const NotificationModal = mongoose.model("Notification", NotificationSchema);

export default NotificationModal;
