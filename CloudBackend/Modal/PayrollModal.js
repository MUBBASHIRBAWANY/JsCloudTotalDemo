import mongoose from "mongoose";

const PayrollSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },

    totalDaysInMonth: { type: Number, default: 0 },
    workingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    holidayDays: { type: Number, default: 0 },
    offDays: { type: Number, default: 0 },
    extraDays: { type: Number, default: 0 },
    extraDayPay: { type: Number, default: 0 },
    attendanceAllowance: { type: Number, default: 0 },
    unpaidDays: { type: Number, default: 0 },

    overtimeHours: { type: Number, default: 0 },
    overtimeRate: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },

    perDayRate: { type: Number, default: 0 },
    perMinuteRate: { type: Number, default: 0 },
    totalLateMinutes: { type: Number, default: 0 },
    basicSalary: { type: Number, default: 0 },
    finalBasicSalary: { type: Number, default: 0 },

    allowances: { type: Array, default: [] },
    totalAllowances: { type: Number, default: 0 },

    deductions: { type: Array, default: [] },
    totalDeductions: { type: Number, default: 0 },

    grossSalary: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },

    status: { type: String, enum: ["draft", "processed", "approved", "paid", "closed"], default: "draft" },
    processedAt: { type: Date },
    approvedAt: { type: Date },
    paidAt: { type: Date },
    closedAt: { type: Date },

    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    journalVoucherId: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },

    paymentMethod: { type: String, enum: ["bank_transfer", "cash", "cheque"], default: "bank_transfer" },
    paymentReference: { type: String, default: "" },
    paymentDate: { type: Date },
    bankAccount: { type: String, default: "" },

    latePenalty: { type: Number, default: 0 },
    earlyDeparturePenalty: { type: Number, default: 0 },
    totalEarlyMinutes: { type: Number, default: 0 },
    unpaidLeaveDeduction: { type: Number, default: 0 }
}, { timestamps: true });

PayrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

const PayrollModal = mongoose.model("HrPayroll", PayrollSchema);

export default PayrollModal;
