import LeaveApplicationModal from "../modal/LeaveApplicationModal.js";
import LeaveAuditModal from "../modal/LeaveAuditModal.js";
import EmployeeHrModal from "../modal/EmployeeHrModal.js";
import HolidayCalendarModal from "../modal/HolidayCalendarModal.js";
import PayrollAdjustmentModal from "../modal/PayrollAdjustmentModal.js";
import { createNotification } from "./NotificationControllar.js";
import EmployeeLeaveBalanceModal from "../modal/EmployeeLeaveBalanceModal.js";
import LeaveTypeModal from "../modal/LeaveTypeModal.js";
import { validateRequired } from "../engine/Validators.js";
import mongoose from "mongoose";
import { hrmsCatch } from "../utils/hrmsError.js";


/**
 * Balance-enforced leave types per Requirement 2.2.
 * unpaid, maternity, paternity are exempt from balance checks.
 */
const BALANCE_ENFORCED_TYPES = ["casual", "medical", "annual"];

/**
 * Count working days between startDate and endDate (inclusive),
 * excluding the employee's off-days and any holidays in HolidayCalendar.
 *
 * @param {Date}     startDate
 * @param {Date}     endDate
 * @param {string[]} offDays      - e.g. ["Sunday", "Saturday"]
 * @param {Date[]}   holidayDates - array of holiday Date objects
 * @returns {number}
 */
function countWorkingDays(startDate, endDate, offDays, holidayDates) {
    const offDayNames = new Set((offDays || []).map(d => d.toLowerCase()));

    // Normalise holiday dates to midnight strings for O(1) lookup
    const holidaySet = new Set(
        holidayDates.map(d => {
            const dt = new Date(d);
            dt.setHours(0, 0, 0, 0);
            return dt.toISOString();
        })
    );

    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    let count = 0;
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
        const dayName = dayNames[cursor.getDay()];
        const isOffDay = offDayNames.has(dayName);
        const isHoliday = holidaySet.has(cursor.toISOString());

        if (!isOffDay && !isHoliday) {
            count++;
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return count;
}

/**
 * POST /HrLeave
 * Submit a leave application.
 * Requirements 2.1, 2.2, 2.3, 2.7, 2.9, 2.12
 */
export const submitLeave = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, [
            "employeeId", "leaveType", "startDate", "endDate"
        ]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const { employeeId, leaveType, startDate, endDate, reason, leaveTypeId, isHalfDay, halfDaySlot, attachmentUrl, medicalCertUrl, emergencyContact, contactDuringLeave } = req.body;

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["startDate and endDate must be valid dates"]
            });
        }
        if (end < start) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["endDate must be greater than or equal to startDate"]
            });
        }

        // Validate reason length
        if (reason && reason.length > 500) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["reason must not exceed 500 characters"]
            });
        }

        // Load employee for Leave_Bucket and policyTags
        const employee = await EmployeeHrModal.findById(employeeId);
        if (!employee) {
            return res.status(404).send({
                status: false,
                error: "Employee not found", details: ["No employee exists for this id."]
            });
        }

        // Requirement 2.12 — reject if a pending application overlaps this date range
        const overlapping = await LeaveApplicationModal.findOne({
            employeeId,
            status: "pending",
            startDate: { $lte: end },
            endDate: { $gte: start }
        });
        if (overlapping) {
            return res.status(409).send({ status: false, error: "Overlapping leave",
                details: [
                    `A pending application already exists from ${overlapping.startDate.toISOString().slice(0, 10)} to ${overlapping.endDate.toISOString().slice(0, 10)}`
                ]
            });
        }

        // Fetch holidays within the date range from HolidayCalendar
        const holidays = await HolidayCalendarModal.find({
            date: { $gte: start, $lte: end }
        }).select("date");

        const offDays = employee.policyTags?.workWeek?.offDays || ["Sunday"];
        let daysRequested = countWorkingDays(start, end, offDays, holidays.map(h => h.date));

        // Half-day: count as 0.5
        if (isHalfDay) {
            daysRequested = 0.5;
        }

        // Balance enforcement — new path: use LeaveTypeId + EmployeeLeaveBalance
        if (leaveTypeId) {
            const lt = await LeaveTypeModal.findById(leaveTypeId);
            if (lt && lt.isPaid) {
                const year = start.getFullYear();
                const balance = await EmployeeLeaveBalanceModal.findOne({
                    employeeId, leaveTypeId, year
                });
                const available = balance ? (balance.allocated + balance.carriedForward - balance.used) : 0;
                if (daysRequested > available) {
                    return res.status(400).send({
                        status: false,
                        error: `Insufficient leave balance. Available: ${available} day(s)`,
                        details: []
                    });
                }
            }
            // Unpaid leave types skip balance check
        } else {
            // Legacy path: use leaveBucket for old leaveType string
            if (BALANCE_ENFORCED_TYPES.includes(leaveType)) {
                const bucket = employee.leaveBucket?.[leaveType];
                const balance = bucket?.balance ?? 0;
                if (daysRequested > balance) {
                    return res.status(400).send({
                        status: false,
                        error: `Insufficient leave balance. Available balance for ${leaveType}: ${balance} day(s)`,
                        details: []
                    });
                }
            }
        }

        const application = await LeaveApplicationModal.create({
            employeeId,
            leaveType,
            leaveTypeId: leaveTypeId || undefined,
            isHalfDay: isHalfDay || false,
            halfDaySlot: halfDaySlot || undefined,
            attachmentUrl: attachmentUrl || "",
            medicalCertUrl: medicalCertUrl || "",
            emergencyContact: emergencyContact || "",
            contactDuringLeave: contactDuringLeave || "",
            startDate: start,
            endDate: end,
            daysRequested,
            reason: reason || "",
            status: "pending"
        });

        // Notify HR about new leave request
        const emp = await EmployeeHrModal.findById(employeeId).select("firstName lastName code");
        const empName = emp ? `${emp.firstName} ${emp.lastName || ""}`.trim() : "Employee";
        createNotification(null, "leave", "leave_application", application._id,
            "New Leave Request", `${empName} (${emp?.code || ""}) applied for ${daysRequested} day(s)`,
            "/LeaveApplicationList", "medium");

        return res.status(200).send({ status: true, data: application });
    } catch (err) {
        return hrmsCatch(res, err, "Leave update failed", "The leave could not be updated. Please try again.");
    }
};

/**
 * PUT /HrLeave/:id/approve
 * Approve a pending leave application and deduct from Leave_Bucket.
 * Requirements 2.4, 2.5
 */
export const approveLeave = async (req, res) => {
    try {
        const { remark, approverId } = req.body;

        if (!remark || remark.trim() === "") {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["remark is required for approval"]
            });
        }
        if (remark.length > 500) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["remark must not exceed 500 characters"]
            });
        }

        const application = await LeaveApplicationModal.findById(req.params.id);
        if (!application) {
            return res.status(404).send({
                status: false,
                error: "Leave application not found", details: ["No leave application exists for this id."]
            });
        }
        if (application.status !== "pending") {
            return res.status(400).send({
                status: false,
                error: `Cannot approve a leave application with status "${application.status}"`,
                details: []
            });
        }

        // Deduct from Leave_Bucket for balance-enforced types — Requirement 2.5
        // New path: use EmployeeLeaveBalance if leaveTypeId exists
        if (application.leaveTypeId) {
            const year = new Date(application.startDate).getFullYear();
            await EmployeeLeaveBalanceModal.findOneAndUpdate(
                { employeeId: application.employeeId, leaveTypeId: application.leaveTypeId, year },
                { $inc: { used: application.daysRequested, balance: -application.daysRequested } }
            );
        } else if (BALANCE_ENFORCED_TYPES.includes(application.leaveType)) {
            // Legacy path: use leaveBucket
            await EmployeeHrModal.findByIdAndUpdate(application.employeeId, {
                $inc: {
                    [`leaveBucket.${application.leaveType}.used`]: application.daysRequested,
                    [`leaveBucket.${application.leaveType}.balance`]: -application.daysRequested
                }
            });
        }

        application.status = "approved";
        application.approverRemark = remark;
        if (approverId) application.approverId = approverId;
        await application.save();

        // Notify employee about approval
        createNotification(application.employeeId, "leave", "leave_approved", application._id,
            "Leave Approved", `Your leave request for ${application.daysRequested} day(s) has been approved`,
            "/LeaveApplicationList", "high");

        return res.status(200).send({ status: true, data: application });
    } catch (err) {
        return hrmsCatch(res, err, "Leave update failed", "The leave could not be updated. Please try again.");
    }
};

/**
 * PUT /HrLeave/:id/reject
 * Reject a pending leave application; bucket unchanged.
 * Requirements 2.4, 2.6
 */
export const rejectLeave = async (req, res) => {
    try {
        const { remark, approverId } = req.body;

        if (!remark || remark.trim() === "") {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["remark is required for rejection"]
            });
        }
        if (remark.length > 500) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["remark must not exceed 500 characters"]
            });
        }

        const application = await LeaveApplicationModal.findById(req.params.id);
        if (!application) {
            return res.status(404).send({
                status: false,
                error: "Leave application not found", details: ["No leave application exists for this id."]
            });
        }
        if (application.status !== "pending") {
            return res.status(400).send({
                status: false,
                error: `Cannot reject a leave application with status "${application.status}"`,
                details: []
            });
        }

        application.status = "rejected";
        application.approverRemark = remark;
        if (approverId) application.approverId = approverId;
        await application.save();

        // Notify employee about rejection
        createNotification(application.employeeId, "leave", "leave_rejected", application._id,
            "Leave Rejected", `Your leave request has been rejected. Reason: ${remark}`,
            "/LeaveApplicationList", "high");

        return res.status(200).send({ status: true, data: application });
    } catch (err) {
        return hrmsCatch(res, err, "Leave update failed", "The leave could not be updated. Please try again.");
    }
};

/**
 * POST /HrLeave/encash/:empId
 * Encash unused annual leave for an employee.
 * Requirements 2.8
 */
export const encashLeave = async (req, res) => {
    try {
        const { empId } = req.params;

        const employee = await EmployeeHrModal.findById(empId);
        if (!employee) {
            return res.status(404).send({
                status: false,
                error: "Employee not found", details: ["No employee exists for this id."]
            });
        }

        const unusedDays = employee.leaveBucket?.annual?.balance ?? 0;
        if (unusedDays <= 0) {
            return res.status(400).send({
                status: false,
                error: "No encashable days available",
                details: []
            });
        }

        const basicSalary = employee.salarySetupBasket?.basicSalary ?? 0;
        const amount = unusedDays * (basicSalary / 30);

        const now = new Date();

        // Create PayrollAdjustment entry — Requirement 2.8
        const adjustment = await PayrollAdjustmentModal.create({
            employeeId: empId,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            type: "other",
            amount,
            description: `Leave encashment: ${unusedDays} annual leave day(s) @ ${basicSalary}/30 per day`,
            createdAt: now.toISOString()
        });

        // Reduce annual Leave_Bucket balance
        await EmployeeHrModal.findByIdAndUpdate(empId, {
            $inc: {
                "leaveBucket.annual.used": unusedDays,
                "leaveBucket.annual.balance": -unusedDays
            }
        });

        return res.status(200).send({
            status: true,
            data: {
                encashedDays: unusedDays,
                amount,
                adjustment
            }
        });
    } catch (err) {
        return hrmsCatch(res, err, "Encash leave failed", "The encash leave could not be completed. Please try again.");
    }
};

/**
 * PUT /HrLeave/adjust/:empId
 * HR-only: manually adjust an employee's Leave_Bucket balance.
 * Requirements 2.11
 */
export const adjustLeaveBalance = async (req, res) => {
    try {
        const { empId } = req.params;
        const validationError = validateRequired(req.body, [
            "leaveType", "newBalance", "reason", "actingHRId"
        ]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const { leaveType, newBalance, reason, actingHRId } = req.body;

        if (typeof newBalance !== "number" || newBalance < 0) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["newBalance must be a non-negative number"]
            });
        }

        const employee = await EmployeeHrModal.findById(empId);
        if (!employee) {
            return res.status(404).send({
                status: false,
                error: "Employee not found", details: ["No employee exists for this id."]
            });
        }

        const previousBalance = employee.leaveBucket?.[leaveType]?.balance ?? 0;

        // Persist new balance
        await EmployeeHrModal.findByIdAndUpdate(empId, {
            [`leaveBucket.${leaveType}.balance`]: newBalance
        });

        // Save audit entry — Requirement 2.11
        const audit = await LeaveAuditModal.create({
            employeeId: empId,
            leaveType,
            previousBalance,
            newBalance,
            reason,
            actingHRId
        });

        return res.status(200).send({ status: true, data: audit });
    } catch (err) {
        return hrmsCatch(res, err, "Adjust leave balance failed", "The adjust leave balance could not be completed. Please try again.");
    }
};

/**
 * GET /HrLeave/calendar?month=M&year=Y
 * Return approved leaves for the specified month and year.
 * Requirements 2.10
 */
export const getLeaveCalendar = async (req, res) => {
    try {
        let { month, year } = req.query;

        const now = new Date();
        month = month ? parseInt(month, 10) : now.getMonth() + 1;
        year = year ? parseInt(year, 10) : now.getFullYear();

        if (month < 1 || month > 12 || isNaN(year)) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["month must be 1–12 and year must be a valid number"]
            });
        }

        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

        const leaves = await LeaveApplicationModal.find({
            status: "approved",
            startDate: { $lte: endOfMonth },
            endDate: { $gte: startOfMonth }
        }).populate("employeeId", "firstName lastName code");

        return res.status(200).send({ status: true, data: leaves });
    } catch (err) {
        return hrmsCatch(res, err, "Leave calendar load failed", "The leave calendar could not be loaded. Please try again.");
    }
};

/**
 * GET /HrLeave/employee/:empId
 * Return the full leave history for an employee.
 * Requirements 2.3
 */
export const getEmployeeLeaves = async (req, res) => {
    try {
        const { empId } = req.params;

        // First find the employee by their code
        const employee = await EmployeeHrModal.findOne({ code: empId });

        if (!employee) {
            return res.status(404).send({
                status: false,
                error: "Employee not found",
                details: [`No employee found with code: ${empId}`]
            });
        }

        // Now use the employee's ObjectId to find their leaves
        const leaves = await LeaveApplicationModal.find({ employeeId: employee._id })
            .populate("employeeId", "code firstName lastName")

            .sort({ createdAt: -1 });

        return res.status(200).send({ status: true, data: leaves });
    } catch (err) {
        return hrmsCatch(res, err, "Employee leaves load failed", "The employee leaves could not be loaded. Please try again.");
    }
};