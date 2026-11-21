import mongoose from "mongoose";
import dotenv from "dotenv";
import ApprovalWorkflowModal from "../Modal/ApprovalWorkflowModal.js";

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
};

const seedLoanWorkflow = async () => {
    try {
        await connectDB();

        const existing = await ApprovalWorkflowModal.findOne({ module: "loan_advance" });
        if (existing) {
            console.log("Loan workflow already exists:", existing.name);
            process.exit(0);
        }

        const workflow = await ApprovalWorkflowModal.create({
            name: "Loan & Advance Approval",
            module: "loan_advance",
            isActive: true,
            steps: [
                {
                    stepNumber: 1,
                    name: "HR Approval",
                    role: "hr",
                    permissions: {
                        canApprove: true,
                        canReject: true,
                        canEditAmount: true,
                        canEditRemarks: true
                    }
                },
                {
                    stepNumber: 2,
                    name: "Finance Approval",
                    role: "finance",
                    permissions: {
                        canApprove: true,
                        canReject: true,
                        canEditAmount: true,
                        canEditRemarks: true
                    }
                },
                {
                    stepNumber: 3,
                    name: "CEO Approval",
                    role: "ceo",
                    permissions: {
                        canApprove: true,
                        canReject: true,
                        canEditAmount: true,
                        canEditRemarks: true
                    }
                },
                {
                    stepNumber: 4,
                    name: "Boss Approval",
                    role: "boss",
                    permissions: {
                        canApprove: true,
                        canReject: true,
                        canEditAmount: true,
                        canEditRemarks: true
                    }
                },
                {
                    stepNumber: 5,
                    name: "Cashier Payment",
                    role: "cashier",
                    permissions: {
                        canApprove: true,
                        canReject: false,
                        canEditAmount: false,
                        canEditRemarks: true
                    }
                }
            ]
        });

        console.log("Loan workflow created:", workflow.name);
        process.exit(0);
    } catch (err) {
        console.error("Seed error:", err);
        process.exit(1);
    }
};

seedLoanWorkflow();
