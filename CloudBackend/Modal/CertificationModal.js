import mongoose from "mongoose";

/**
 * Certification modal for Training & Development (LMS) module.
 * Requirements 5.6, 5.9
 *
 * Virtual field `expiryStatus`:
 *   - "expired"       — expiryDate is in the past
 *   - "expiring-soon" — expiryDate - today < 30 days (and not yet expired)
 *   - "valid"         — more than 30 days remaining (exactly 30 days is NOT flagged)
 *   - null            — no expiryDate defined
 */
const CertificationSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmployeeHr",
        required: [true, "Employee reference is required"]
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrCourse",
        required: [true, "Course reference is required"]
    },
    enrollmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrEnrollment",
        required: [true, "Enrollment reference is required"]
    },
    issueDate: {
        type: Date,
        required: [true, "Issue date is required"]
    },
    expiryDate: {
        type: Date   // optional
    },
    referenceNumber: {
        type: String,
        required: [true, "Certificate reference number is required"]
    }
}, {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true }
});

/**
 * Virtual: expiryStatus
 * Requirement 5.9 — "expiring-soon" when daysRemaining < 30,
 * "expired" when expiryDate is in the past, "valid" otherwise.
 * Returns null when no expiryDate is set.
 */
CertificationSchema.virtual("expiryStatus").get(function () {
    if (!this.expiryDate) return null;

    const today     = new Date();
    const msPerDay  = 24 * 60 * 60 * 1000;
    // Strip time component for a clean day-level comparison
    const todayMidnight    = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const expiryMidnight   = new Date(
        this.expiryDate.getFullYear(),
        this.expiryDate.getMonth(),
        this.expiryDate.getDate()
    );

    const daysRemaining = (expiryMidnight - todayMidnight) / msPerDay;

    if (daysRemaining < 0)  return "expired";
    if (daysRemaining < 30) return "expiring-soon";
    return "valid";
});

const CertificationModal = mongoose.model("HrCertification", CertificationSchema);

export default CertificationModal;
