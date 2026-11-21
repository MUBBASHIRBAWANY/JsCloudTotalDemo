import EmployeeShiftHistoryModal from "../Modal/EmployeeShiftHistoryModal.js";
import CompanyPolicyModal from "../Modal/CompanyPolicyModal.js";

/**
 * Get the active shift for an employee on a specific date.
 * Falls back to company policy default shift if no assignment found.
 *
 * @param {ObjectId} employeeId
 * @param {Date|string} date - Date object or "YYYY-MM-DD" string
 * @returns {Object|null} - Shift document or null
 */
export async function getShiftForDate(employeeId, date) {
    const targetDate = typeof date === "string" ? new Date(date) : date;

    const record = await EmployeeShiftHistoryModal.findOne({
        employeeId,
        effectiveFrom: { $lte: targetDate },
        $or: [
            { effectiveTo: { $gte: targetDate } },
            { effectiveTo: null }
        ],
        isActive: true
    }).sort({ effectiveFrom: -1 }).populate("shiftId");

    if (record && record.shiftId) {
        return record.shiftId;
    }

    // Fallback to company policy default
    const policy = await CompanyPolicyModal.findOne();
    if (policy) {
        return {
            name: "Default",
            startTime: policy.shiftStart || "09:00",
            endTime: policy.shiftEnd || "17:00",
            gracePeriodMinutes: policy.gracePeriodMinutes || 15
        };
    }

    return null;
}

/**
 * Get the shift history for an employee (all records).
 *
 * @param {ObjectId} employeeId
 * @returns {Array}
 */
export async function getShiftHistory(employeeId) {
    return EmployeeShiftHistoryModal.find({ employeeId })
        .populate("shiftId", "name startTime endTime gracePeriodMinutes")
        .sort({ effectiveFrom: -1 });
}
