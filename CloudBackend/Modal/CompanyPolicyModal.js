import mongoose from "mongoose";

const CompanyPolicySchema = new mongoose.Schema({
    // Shift & Attendance
    shiftStart: { type: String, default: "09:00" },
    shiftEnd: { type: String, default: "17:00" },
    gracePeriodMinutes: { type: Number, default: 15 },
    earlyDepartureGraceMinutes: { type: Number, default: 0 },
    workWeek: {
        offDays: { type: [String], default: ["Sunday"] }
    },

    // Overtime & Late
    overtimeMultiplier: { type: Number, default: 1.5 },
    holidayOvertimeMultiplier: { type: Number, default: 2.0 },
    maxOvertimeHours: { type: Number, default: 4 },
    workingDaysPerWeek: { type: Number, default: 6 },
    maxLateDaysPerMonth: { type: Number, default: 0 },
    autoHalfDayAfterMinutes: { type: Number, default: 0 },
    autoAbsentAfterMinutes: { type: Number, default: 0 },

    // Salary Calculation
    payCalculationBasis: { type: String, enum: ["monthly_days", "working_days"], default: "monthly_days" },

    // Leave Policy (Configurable)
    casualLeave: { type: Number, default: 12 },
    medicalLeave: { type: Number, default: 10 },
    annualLeave: { type: Number, default: 14 },
    annualLeaveCarryForward: { type: Boolean, default: true },
    annualLeaveMaxCarry: { type: Number, default: 14 },
    freeLeavePerMonth: { type: Number, default: 1 },

    // Tax & Statutory
    incomeTaxEnabled: { type: Boolean, default: false },
    taxSlabs: [{
        from: { type: Number, default: 0 },
        to: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 }
    }],
    eobiEmployeeShare: { type: Number, default: 0 },
    eobiEmployerShare: { type: Number, default: 0 },
    socialSecurityRate: { type: Number, default: 0 },

    // EBF (Employee Benevolent Fund)
    ebfEmployeeRate: { type: Number, default: 0 },  // Percentage of basic salary
    ebfEmployerRate: { type: Number, default: 0 },  // Percentage of basic salary

    // Payslip Settings
    companyName: { type: String, default: "" },
    payslipHeader: { type: String, default: "" },
    payslipFooter: { type: String, default: "" }
}, { timestamps: true });

const CompanyPolicyModal = mongoose.model("CompanyPolicy", CompanyPolicySchema);
export default CompanyPolicyModal;
