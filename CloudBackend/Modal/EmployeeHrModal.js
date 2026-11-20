import mongoose from "mongoose";

const EmployeeHrSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, default: "" },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, default: "" },
    cnic: { type: String, default: "" },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"], default: "male" },
    bloodGroup: { type: String, default: "" },
    maritalStatus: { type: String, default: "" },
    religion: { type: String, default: "" },
    imageUrl: { type: String, default: "" },

    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "HrDepartment", required: true },
    designationId: { type: mongoose.Schema.Types.ObjectId, ref: "HrDesignation", required: true },
    storeId: { type: String, default: null },
    cityId: { type: String, default: null },
    locationId: { type: String, default: null },
    isForDistributor: { type: Boolean, default: false },
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", default: null },
    joiningDate: { type: Date },
    employmentType: { type: String, enum: ["permanent", "contract", "guest", "intern"], default: "permanent" },
    probationEndDate: { type: Date },
    confirmationDate: { type: Date },
    status: { type: String, enum: ["active", "inactive", "terminated", "on_notice"], default: "active" },
    statusDate: { type: Date, default: null },

    policyTags: {
        religion: { type: String, enum: ["Muslim", "Hindu", "Christian", "Other"], default: "Muslim" },
        workWeek: {
            offDays: { type: [String], default: ["Sunday"] }
        }
    },

    leaveBucket: {
        casual: { allocated: { type: Number, default: 16 }, used: { type: Number, default: 0 }, balance: { type: Number, default: 16 } },
        medical: { allocated: { type: Number, default: 10 }, used: { type: Number, default: 0 }, balance: { type: Number, default: 10 } },
        annual: { allocated: { type: Number, default: 14 }, used: { type: Number, default: 0 }, balance: { type: Number, default: 14 } }
    },

    salarySetupBasket: {
        basicSalary: { type: Number, default: 0 },
        allowances: [{
            typeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrAllowanceType", default: null },
            code: { type: String, default: "" },
            name: { type: String, default: "" },
            amount: { type: Number, default: 0 }
        }],
        deductions: [{
            typeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrDeductionType", default: null },
            code: { type: String, default: "" },
            name: { type: String, default: "" },
            amount: { type: Number, default: 0 }
        }]
    },

    // Working hours per day (configurable per employee)
    workingHours: { type: Number, default: 9 },

    // Task 2B: per-employee salary lines grid (additive — salarySetupBasket retained)
    salaryLines: [{
        code: String,
        description: String,
        type: { type: String, enum: ["earning", "deduction"] },
        amount: { type: Number, default: 0 },
        linkAccount: { type: String, default: "" }
    }],

    taxInfo: {
        ntuNumber: { type: String, default: "" },
        eobiNumber: { type: String, default: "" },
        socialSecurityNumber: { type: String, default: "" }
    },

    bankName: { type: String, default: "" },
    bankAccount: { type: String, default: "" },
    emergencyContact: {
        name: { type: String, default: "" },
        phone: { type: String, default: "" },
        relation: { type: String, default: "" }
    },
    address: { type: String, default: "" },

    // Task 3 — PDL Header fields
    fatherName: { type: String, default: "" },
    personalFileNo: { type: String, default: "" },
    insurancePolicyNo: { type: String, default: "" },
    contractorId: { type: mongoose.Schema.Types.ObjectId, ref: "HrContractor", default: null },

    // Task 3 — Personal-2
    birthPlace: { type: String, default: "" },
    drivingLicenseNo: { type: String, default: "" },
    drivingLicenseExpiry: { type: Date, default: null },

    // Task 3 — Other Info
    ebfDate: { type: Date, default: null },
    sessiDate: { type: Date, default: null },
    providentFund: { type: Boolean, default: false },
    hasBadDebt: { type: Boolean, default: false },
    hasLoan: { type: Boolean, default: false },
    hasEBF: { type: Boolean, default: false },
    hasAdvance: { type: Boolean, default: false },
    payType: { type: String, enum: ["cash", "cheque", "bank_transfer"], default: "bank_transfer" },

    // Task 3 — Opening Leaves (balance at time of setup)
    openingLeaves: {
        casual: { type: Number, default: 0 },
        medical: { type: Number, default: 0 },
        annual: { type: Number, default: 0 }
    },

    // Leave configuration
    annualLeave: { type: Boolean, default: true },
    encashable: { type: Boolean, default: false },
    attendanceAllowance: { type: Boolean, default: false },
    attendanceAllowancePerDay: { type: Number, enum: [1, 2], default: 1 },

    // Task 3 — Daily / Overtime setup
    dailySetup: {
        timeIn: { type: String, default: "09:00" },
        timeOut: { type: String, default: "18:00" }
    },
    overtimeSetup: {
        otAllowed: { type: Boolean, default: false },
        otRate: { type: Number, default: 0 }
    },
    excludeGrace: { type: Boolean, default: false },
    gracePeriodMinutes: { type: Number, default: 15 },
    lateDeduction: { type: Boolean, default: true },

    // Task 3 — Reason (joining/leaving)
    reasonId: { type: mongoose.Schema.Types.ObjectId, ref: "HrReason", default: null }
}, { timestamps: true });

const EmployeeHrModal = mongoose.model("HrEmployee", EmployeeHrSchema);

export default EmployeeHrModal;
