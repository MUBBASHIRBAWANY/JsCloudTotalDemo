import mongoose from "mongoose";

/**
 * Employee Document Vault modal — Module 9 (Document Management).
 * Requirements 9.1, 9.3, 9.4, 9.5
 *
 * Stores HR documents (CNIC, contracts, payslips, etc.) per employee
 * with an optional version history array (max 10 entries, FIFO trimming
 * is handled by the controller via $pop: -1 when the array exceeds 10).
 *
 * Virtual field `expiryStatus`:
 *   - null            — no expiryDate defined
 *   - "expired"       — expiryDate is strictly before today (midnight)
 *   - "expiring-soon" — days remaining < 30 (and not yet expired)
 *   - "valid"         — 30 or more days remaining (exactly 30 is NOT flagged)
 */
const VersionEntrySchema = new mongoose.Schema(
    {
        fileRef:    { type: String, required: [true, "Version fileRef is required"] },
        replacedAt: { type: Date,   default: () => new Date() }
    },
    { _id: false }
);

const EmployeeDocumentSchema = new mongoose.Schema(
    {
        employeeId: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      "EmployeeHr",
            required: [true, "Employee reference is required"]
        },

        documentType: {
            type:     String,
            enum:     {
                values:  ["CNIC", "employment-contract", "NDA", "certificate", "payslip", "other"],
                message: "documentType must be one of: CNIC, employment-contract, NDA, certificate, payslip, other"
            },
            required: [true, "Document type is required"]
        },

        documentTitle: {
            type:      String,
            maxlength: [150, "Document title must not exceed 150 characters"]
        },

        fileRef: {
            type:     String,
            required: [true, "File reference (URL or storage path) is required"]
        },

        issueDate:  { type: Date },

        expiryDate: { type: Date },   // optional

        notes: {
            type:      String,
            maxlength: [500, "Notes must not exceed 500 characters"]
        },

        /**
         * Version history — max 10 entries.
         * Controller pushes the old fileRef here before replacing;
         * if array length would exceed 10 it removes versions[0] first (FIFO).
         */
        versions: {
            type:    [VersionEntrySchema],
            default: []
        }
    },
    {
        timestamps: true,
        toJSON:     { virtuals: true },
        toObject:   { virtuals: true }
    }
);

/**
 * Virtual: expiryStatus
 * Requirements 9.4, 9.5
 *
 * Uses midnight-level comparison so the result is stable for an entire day.
 * "exactly 30 days remaining" (daysRemaining === 30) returns "valid", not "expiring-soon".
 */
EmployeeDocumentSchema.virtual("expiryStatus").get(function () {
    if (!this.expiryDate) return null;

    const msPerDay     = 24 * 60 * 60 * 1000;
    const today        = new Date();
    const todayMidnight  = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const expiryMidnight = new Date(
        this.expiryDate.getFullYear(),
        this.expiryDate.getMonth(),
        this.expiryDate.getDate()
    );

    const daysRemaining = (expiryMidnight - todayMidnight) / msPerDay;

    if (daysRemaining < 0)  return "expired";
    if (daysRemaining < 30) return "expiring-soon";
    return "valid";
});

const EmployeeDocumentModal = mongoose.model("HrEmployeeDocument", EmployeeDocumentSchema);

export default EmployeeDocumentModal;
