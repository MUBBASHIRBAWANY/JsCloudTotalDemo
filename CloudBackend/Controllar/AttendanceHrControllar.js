import AttendanceHrModal from "../Modal/AttendanceHrModal.js"
import EmployeeHrModal from "../Modal/EmployeeHrModal.js"
import HolidayCalendarModal from "../Modal/HolidayCalendarModal.js"
import CompanyPolicyModal from "../Modal/CompanyPolicyModal.js"
import LeaveApplicationModal from "../Modal/LeaveApplicationModal.js"
import AttendanceMonthLockModal from "../Modal/AttendanceMonthLockModal.js"
import AttendanceAuditLogModal from "../Modal/AttendanceAuditLogModal.js"
import { convertPunchesToAttendance } from "../engine/PunchToAttendance.js"
import ZKTecoClient from "../engine/ZKTecoClient.js"
import { AttendanceLogger } from "../config/attendanceConfig.js"
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


// Parse "YYYY-MM-DD" without timezone shift (avoids UTC offset issues)
function parseDateStr(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
}

// Convert Date to "YYYY-MM-DD" in local timezone
function toLocalDateStr(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export const CreateAttendance = async (req, res) => {
    try {
        const { employeeId, date, checkIn, checkOut, status, attendanceStatus, workMode, remarks, informed } = req.body

        // Check if month is frozen
        if (date) {
            const [year, month] = date.split("-").map(Number);
            const lock = await AttendanceMonthLockModal.findOne({ month, year });
            if (lock && lock.locked) {
                return hrmsFail(res, 403, "Attendance locked", "Attendance for this period is locked.");
            }
        }

        const existing = await AttendanceHrModal.findOne({ employeeId, date })
        if (existing) {
            return hrmsFail(res, 409, "Attendance already marked", "Attendance is already marked for this date.")
        }

        const data = await AttendanceHrModal.create({
            employeeId, date,
            checkIn: checkIn || "",
            checkOut: checkOut || "",
            status: status || "present",
            attendanceStatus: attendanceStatus || status || "present",
            workMode: workMode || "office",
            remarks: remarks || "",
            informed: Boolean(informed)
        })

        // Audit log
        await AttendanceAuditLogModal.create({
            attendanceId: data._id,
            employeeId,
            action: "created",
            performedBy: req.user?._id,
            newValue: { checkIn, checkOut, status, attendanceStatus, workMode },
            ipAddress: req.ip
        })

        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Attendance save failed", "The attendance could not be saved. Please try again.");
    }
}

export const CheckOut = async (req, res) => {
    try {
        const { checkOut } = req.body
        const data = await AttendanceHrModal.findByIdAndUpdate(
            req.params.id,
            { checkOut },
            { new: true }
        )
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Checkout failed", "Attendance checkout could not be saved. Please try again.");
    }
}

export const getAllAttendance = async (req, res) => {
    try {
        const data = await AttendanceHrModal.find().populate("employeeId", "firstName lastName code")
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Attendance list failed", "Attendances could not be loaded. Please try again.");
    }
}

export const getAttendanceByEmployee = async (req, res) => {
    try {
        const data = await AttendanceHrModal.find({ employeeId: req.params.id })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Attendance load failed", "The attendance could not be loaded. Please try again.");
    }
}

export const getAttendanceByDateRange = async (req, res) => {
    try {
        const { startDate, endDate, employeeId, departmentId, storeId } = req.query
        if (!startDate || !endDate) {
            return hrmsFail(res, 400, "Missing fields", "Start date and end date are required.")
        }

        const query = { date: { $gte: startDate, $lte: endDate } }

        // If filtering by department or store, first find matching employees
        if (departmentId || storeId || employeeId) {
            const empQuery = {};
            if (employeeId) empQuery._id = employeeId;
            if (departmentId) empQuery.departmentId = departmentId;
            if (storeId) empQuery.storeId = storeId;
            const employees = await EmployeeHrModal.find(empQuery).select("_id");
            query.employeeId = { $in: employees.map(e => e._id) };
        }

        const data = await AttendanceHrModal.find(query).populate("employeeId", "firstName lastName code departmentId storeId")
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Attendance by date range load failed", "The attendance by date range could not be loaded. Please try again.");
    }
}

export const UpdateAttendance = async (req, res) => {
    try {
        // Check if month is frozen
        const existing = await AttendanceHrModal.findById(req.params.id).lean();
        if (existing?.date) {
            const [year, month] = existing.date.split("-").map(Number);
            const lock = await AttendanceMonthLockModal.findOne({ month, year });
            if (lock && lock.locked) {
                return hrmsFail(res, 403, "Attendance locked", "Attendance for this period is locked.");
            }
        }

        const oldValue = await AttendanceHrModal.findById(req.params.id).lean();
        const data = await AttendanceHrModal.findByIdAndUpdate(req.params.id, req.body, { new: true })

        // Audit log
        await AttendanceAuditLogModal.create({
            attendanceId: req.params.id,
            employeeId: oldValue?.employeeId,
            action: "updated",
            performedBy: req.user?._id,
            oldValue: oldValue ? { checkIn: oldValue.checkIn, checkOut: oldValue.checkOut, status: oldValue.status, attendanceStatus: oldValue.attendanceStatus } : null,
            newValue: req.body,
            ipAddress: req.ip
        })

        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Attendance update failed", "The attendance could not be updated. Please try again.");
    }
}

// ─── Utility ────────────────────────────────────────────────────────────────

/**
 * Compute overtime hours for a single attendance record.
 * Formula (Req 6.5):
 *   round2((checkoutMinutes - shiftEndMinutes - thresholdMinutes) / 60)
 * Returns 0 when checkout does not exceed shiftEnd + threshold.
 *
 * @param {number} checkoutTime       - checkout time in minutes from midnight
 * @param {number} shiftEndTime       - shift end time in minutes from midnight
 * @param {number} thresholdMinutes   - minimum threshold before overtime counts
 * @returns {number}
 */
export function computeOvertimeForRecord(checkoutTime, shiftEndTime, thresholdMinutes) {
    if (checkoutTime <= shiftEndTime + thresholdMinutes) return 0;
    const raw = (checkoutTime - shiftEndTime - thresholdMinutes) / 60;
    return Math.round(raw * 100) / 100;
}

// ─── Bulk CSV Upload ─────────────────────────────────────────────────────────

/**
 * POST /HrAttendance/bulk-upload
 * Body: { rows: [{employeeCode, date, checkIn, checkOut, status}], autoFillAbsences: boolean }
 * When autoFillAbsences=true, missing working days for each employee get "absent" records.
 * Sundays/holidays/off-days are skipped (no record created).
 */
export const bulkCsvUpload = async (req, res) => {
    const logger = new AttendanceLogger('bulk-upload');
    
    try {
        const rows = req.body.rows;
        const autoFillAbsences = req.body.autoFillAbsences !== false;
        if (!Array.isArray(rows) || rows.length === 0) {
            return hrmsFail(res, 400, "Invalid request", "Upload at least one attendance row.");
        }

        logger.info(`Starting bulk upload with ${rows.length} rows, autoFill: ${autoFillAbsences}`);

        const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
        const VALID_STATUSES = ["present", "absent", "late", "leave", "half-day"];
        const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        const errors = [];
        const toInsert = [];
        let skipCount = 0;

        // Track which employees and dates we're processing (for auto-fill)
        const employeeDateMap = new Map(); // employeeCode -> Set of date strings
        const employeeIdMap = new Map();   // employeeCode -> ObjectId
        const dateSet = new Set();         // all dates in the upload

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const { employeeCode, date, checkIn, checkOut, status } = row;

            if (!employeeCode) {
                errors.push({ row: i, employeeCode, reason: "missing employee code" });
                continue;
            }

            // Validate date format
            if (!date || !DATE_RE.test(date)) {
                errors.push({ row: i, employeeCode, reason: `invalid date format (got: "${date}", expected: YYYY-MM-DD)` });
                continue;
            }

            // Normalize status
            let normalizedStatus = (status || "").toLowerCase().trim();
            if (!normalizedStatus || !VALID_STATUSES.includes(normalizedStatus)) {
                // Auto-detect from check-in/check-out
                if (checkIn) normalizedStatus = "present";
                else if (checkOut) normalizedStatus = "present";
                else normalizedStatus = "absent";
            }

            // Validate employee exists
            const employee = await EmployeeHrModal.findOne({ code: employeeCode }).select("_id").lean();
            if (!employee) {
                errors.push({ row: i, employeeCode, reason: "unrecognised employee code" });
                continue;
            }

            // Track for auto-fill
            if (!employeeDateMap.has(employeeCode)) employeeDateMap.set(employeeCode, new Set());
            employeeDateMap.get(employeeCode).add(date);
            employeeIdMap.set(employeeCode, employee._id);
            dateSet.add(date);

            // Check for duplicate — skip silently (can re-upload same file)
            const duplicate = await AttendanceHrModal.findOne({ employeeId: employee._id, date }).lean();
            if (duplicate) {
                skipCount++;
                continue;
            }

            toInsert.push({
                employeeId: employee._id,
                date,
                checkIn: checkIn || "",
                checkOut: checkOut || "",
                status: normalizedStatus,
                attendanceStatus: normalizedStatus === "late" ? "present" : normalizedStatus,
                workMode: "office"
            });
        }

        // Auto-fill missing days as "absent" for working days only
        if (autoFillAbsences && dateSet.size > 0) {
            const sortedDates = [...dateSet].sort();
            const earliestParsed = parseDateStr(sortedDates[0]);
            const latestParsed = parseDateStr(sortedDates[sortedDates.length - 1]);

            // Find all months in the date range
            const monthsToProcess = new Set();
            let checkDate = new Date(earliestParsed);
            while (checkDate <= latestParsed) {
                monthsToProcess.add(`${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`);
                checkDate.setDate(checkDate.getDate() + 1);
            }

            logger.info(`Months to process: ${[...monthsToProcess].join(', ')}`);

            for (const monthKey of monthsToProcess) {
                const [yearStr, monthStr] = monthKey.split('-');
                const year = parseInt(yearStr);
                const month = parseInt(monthStr);
                const daysInMonth = new Date(year, month, 0).getDate();

                logger.info(`Processing ${monthKey}: ${daysInMonth} days`);

                // Fetch holidays for this month
                const monthStart = new Date(year, month - 1, 1);
                const monthEnd = new Date(year, month, 0, 23, 59, 59);
                const holidays = await HolidayCalendarModal.find({
                    date: { $gte: monthStart, $lte: monthEnd },
                }).lean();
                const holidayDates = new Set(holidays.map(h => toLocalDateStr(h.date)));

                logger.info(`Holidays in ${monthKey}: ${holidayDates.size}`, [...holidayDates]);

                // For each employee, find missing days
                for (const [empCode, empId] of employeeIdMap) {
                    const empDates = employeeDateMap.get(empCode) || new Set();
                    logger.info(`Employee ${empCode}: ${empDates.size} records in upload`);

                    // Get employee's off-days
                    const emp = await EmployeeHrModal.findById(empId).select("policyTags.workWeek.offDays").lean();
                    const offDays = emp?.policyTags?.workWeek?.offDays || ["Sunday"];
                    logger.info(`Employee ${empCode}: off-days = [${offDays}]`);

                    // Fetch approved leaves
                    const approvedLeaves = await LeaveApplicationModal.find({
                        employeeId: empId,
                        status: "approved",
                        startDate: { $lte: monthEnd },
                        endDate: { $gte: monthStart }
                    }).lean();

                    // Build map of leave date → leave application (for leaveTypeId lookup)
                    const leaveDateMap = new Map();
                    for (const leave of approvedLeaves) {
                        const start = new Date(leave.startDate);
                        const end = new Date(leave.endDate);
                        const sDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                        const eDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                        for (let ld = new Date(sDate); ld <= eDate; ld.setDate(ld.getDate() + 1)) {
                            leaveDateMap.set(toLocalDateStr(ld), leave);
                        }
                    }
                    if (leaveDateMap.size > 0) {
                        logger.info(`Employee ${empCode}: approved leaves = [${[...leaveDateMap.keys()]}]`);
                    }

                    for (let d = 1; d <= daysInMonth; d++) {
                        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

                        // Skip if already has a record in upload
                        if (empDates.has(dateStr)) continue;

                        // Skip if date is outside upload range
                        const dateParsed = parseDateStr(dateStr);
                        if (dateParsed < earliestParsed || dateParsed > latestParsed) continue;

                        // PRIORITY 1: Holiday → Skip
                        if (holidayDates.has(dateStr)) continue;

                        // PRIORITY 2: Week Off → Skip
                        const dayOfWeek = WEEKDAY_NAMES[dateParsed.getDay()];
                        if (offDays.includes(dayOfWeek)) continue;

                        // Check if record already exists in DB
                        const existing = await AttendanceHrModal.findOne({ employeeId: empId, date: dateStr }).lean();
                        if (existing) continue;

                        // PRIORITY 3: Approved Leave → "leave" status with leave type link
                        if (leaveDateMap.has(dateStr)) {
                            const leaveApp = leaveDateMap.get(dateStr);
                            toInsert.push({
                                employeeId: empId,
                                date: dateStr,
                                checkIn: "",
                                checkOut: "",
                                status: "leave",
                                attendanceStatus: "leave",
                                workMode: "office",
                                leaveApplicationId: leaveApp._id,
                                leaveTypeId: leaveApp.leaveTypeId
                            });
                            continue;
                        }

                        // PRIORITY 4: No punch → "absent" status
                        toInsert.push({ employeeId: empId, date: dateStr, checkIn: "", checkOut: "", status: "absent", attendanceStatus: "absent", workMode: "office" });
                    }

                    const absentCount = toInsert.filter(r => r.employeeId.toString() === empId.toString() && r.status === 'absent').length;
                    const leaveCount = toInsert.filter(r => r.employeeId.toString() === empId.toString() && r.status === 'leave').length;
                    logger.info(`Employee ${empCode} (${monthKey}): ${absentCount} absent, ${leaveCount} leave`);
                }
            }
        }
        if (toInsert.length > 0) {
            await AttendanceHrModal.insertMany(toInsert);
        }

        const logFile = logger.writeToFile();
        logger.info(`Upload complete: ${toInsert.length} new, ${skipCount} skipped, ${errors.length} errors`);
        logger.info(`Log saved to: ${logFile}`);

        return res.status(200).send({
            status: true,
            processed: toInsert.length,
            skipped: skipCount,
            errors,
            logFile
        });
    }
     catch (err) {
        logger.error(`Upload failed: ${err.message}`);
        logger.writeToFile();
        console.log("bulkCsvUpload error:", err);
        return hrmsCatch(res, err, "Attendance upload failed", "The attendance file could not be uploaded. Please try again.");
    }
};

// ─── Punch Import (ZKTeco CSV) ─────────────────────────────────────────────

/**
 * Shared logic for punch preview and import.
 * @param {Array} punches - raw punch records
 * @param {boolean} overwrite - whether to update existing records
 * @param {boolean} dryRun - if true, don't persist (preview mode)
 */
async function processPunchImport(punches, overwrite, dryRun) {
    const policy = await CompanyPolicyModal.findOne() || {};
    const dailyRecords = convertPunchesToAttendance(punches, policy);

    const errors = [];
    const toInsert = [];
    const toUpdate = [];
    let skipCount = 0;

    // Cache employee lookups
    const empCache = new Map();

    for (let i = 0; i < dailyRecords.length; i++) {
        const rec = dailyRecords[i];
        const { employeeCode, date, checkIn, checkOut, status, overtime } = rec;

        if (!employeeCode) {
            errors.push({ row: i, employeeCode, reason: "missing employee code" });
            continue;
        }

        // Lookup employee (with cache)
        if (!empCache.has(employeeCode)) {
            const emp = await EmployeeHrModal.findOne({ code: employeeCode }).select("_id").lean();
            empCache.set(employeeCode, emp || null);
        }
        const employee = empCache.get(employeeCode);
        if (!employee) {
            errors.push({ row: i, employeeCode, reason: "unrecognised employee code" });
            continue;
        }

        // Check for existing record
        const existing = await AttendanceHrModal.findOne({ employeeId: employee._id, date }).lean();

        if (existing) {
            if (overwrite) {
                toUpdate.push({
                    filter: { _id: existing._id },
                    update: { checkIn, checkOut, status, overtime, remarks: "bulk-import (overwrite)" }
                });
            } else {
                skipCount++;
            }
            continue;
        }

        toInsert.push({
            employeeId: employee._id,
            date,
            checkIn,
            checkOut,
            status,
            attendanceStatus: status === "late" ? "present" : status,
            workMode: "office",
            overtime,
            remarks: "bulk-import",
        });
    }

    if (!dryRun) {
        if (toInsert.length > 0) {
            await AttendanceHrModal.insertMany(toInsert);
        }
        for (const op of toUpdate) {
            await AttendanceHrModal.findOneAndUpdate(op.filter, op.update);
        }
    }

    return {
        status: true,
        processed: toInsert.length + toUpdate.length,
        newRecords: toInsert.length,
        updatedRecords: toUpdate.length,
        skipped: skipCount,
        errors,
        preview: dailyRecords,
    };
}

/**
 * POST /HrAttendance/punch-preview
 * Body: { punches: [{employeeCode, punchTime, punchType}], overwrite: boolean }
 * Process but don't save — returns what would happen.
 */
export const punchPreview = async (req, res) => {
    try {
        const { punches, overwrite } = req.body;
        if (!Array.isArray(punches) || punches.length === 0) {
            return hrmsFail(res, 400, "Invalid request", "At least one punch is required.");
        }
        const result = await processPunchImport(punches, !!overwrite, true);
        return res.status(200).send(result);
    } catch (err) {
        console.log("punchPreview error:", err);
        return hrmsCatch(res, err, "Punch preview failed", "The punch preview could not be completed. Please try again.");
    }
};

/**
 * POST /HrAttendance/punch-import
 * Body: { punches: [{employeeCode, punchTime, punchType}], overwrite: boolean }
 * Process and persist attendance records.
 */
export const punchImport = async (req, res) => {
    try {
        const { punches, overwrite } = req.body;
        if (!Array.isArray(punches) || punches.length === 0) {
            return hrmsFail(res, 400, "Invalid request", "At least one punch is required.");
        }
        const result = await processPunchImport(punches, !!overwrite, false);
        return res.status(200).send(result);
    } catch (err) {
        console.log("punchImport error:", err);
        return hrmsCatch(res, err, "Punch import failed", "The punch import could not be completed. Please try again.");
    }
};

// ─── Biometric Sync ──────────────────────────────────────────────────────────

/**
 * POST /HrAttendance/biometric-sync
 * Req 6.8, 6.9, 6.10, 6.13
 * Body: { punches: [{employeeCode, timestamp, deviceId, punchType}] }
 * punchType: "in" | "out"
 */
export const biometricSync = async (req, res) => {
    try {
        const punches = req.body.punches;
        if (!Array.isArray(punches) || punches.length === 0) {
            return hrmsFail(res, 400, "Invalid request", "At least one punch is required.");
        }

        let processed = 0;
        const errors = [];

        for (let i = 0; i < punches.length; i++) {
            const { employeeCode, timestamp, deviceId, punchType } = punches[i];

            if (!["in", "out"].includes(punchType)) {
                errors.push({ index: i, employeeCode, reason: "invalid punchType" });
                continue;
            }

            if (!timestamp) {
                errors.push({ index: i, employeeCode, reason: "missing timestamp" });
                continue;
            }

            const employee = await EmployeeHrModal.findOne({ code: employeeCode }).select("_id").lean();
            if (!employee) {
                errors.push({ index: i, employeeCode, reason: "unrecognised employee code" });
                continue;
            }

            // Extract YYYY-MM-DD date from timestamp
            const dateObj = new Date(timestamp);
            if (isNaN(dateObj.getTime())) {
                errors.push({ index: i, employeeCode, reason: "invalid timestamp" });
                continue;
            }
            const date = toLocalDateStr(dateObj);

            const existing = await AttendanceHrModal.findOne({ employeeId: employee._id, date }).lean();

            if (punchType === "in") {
                if (!existing) {
                    // Req 6.9 — create new record with checkIn
                    await AttendanceHrModal.create({
                        employeeId: employee._id,
                        date,
                        checkIn: timestamp,
                        checkOut: null,
                        status: "present",
                        attendanceStatus: "present",
                        workMode: "office"
                    });
                } else if (!existing.checkIn) {
                    // Update checkIn if not already set
                    await AttendanceHrModal.findByIdAndUpdate(existing._id, { checkIn: timestamp });
                }
            } else {
                // punchType === "out"
                if (!existing) {
                    // Req 6.13 — create new record with checkOut, no checkIn
                    await AttendanceHrModal.create({
                        employeeId: employee._id,
                        date,
                        checkIn: null,
                        checkOut: timestamp,
                        status: "present",
                    });
                } else if (!existing.checkOut) {
                    // Req 6.10 — update checkOut if not already set
                    await AttendanceHrModal.findByIdAndUpdate(existing._id, { checkOut: timestamp });
                }
            }

            processed++;
        }

        return res.status(200).send({ status: true, processed, errors });
    } catch (err) {
        return hrmsCatch(res, err, "Biometric sync failed", "The biometric sync could not be completed. Please try again.");
    }
};

// ─── Monthly Summary ─────────────────────────────────────────────────────────

/**
 * GET /HrAttendance/summary/:empId/:month/:year
 * Req 6.7
 */
export const getMonthlySummary = async (req, res) => {
    try {
        const { empId, month, year } = req.params;
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);

        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12 || isNaN(yearNum)) {
            return hrmsFail(res, 400, "Invalid value", "Month or year is not valid.");
        }

        const employee = await EmployeeHrModal.findById(empId).lean();
        if (!employee) {
            return hrmsFail(res, 404, "Employee not found", "No employee exists for this id.");
        }

        // Build all days in the month
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        const offDays = employee.policyTags?.workWeek?.offDays || ["Sunday"];

        // Fetch holidays for this month/year
        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum - 1, daysInMonth, 23, 59, 59);
        const holidays = await HolidayCalendarModal.find({
            date: { $gte: monthStart, $lte: monthEnd },
        }).lean();
        const holidaySet = new Set(
            holidays.map(h => toLocalDateStr(h.date))
        );

        // Fetch all attendance records for this employee this month
        const padM = String(monthNum).padStart(2, "0");
        const datePrefix = `${yearNum}-${padM}-`;
        const records = await AttendanceHrModal.find({
            employeeId: empId,
            date: { $regex: `^${yearNum}-${padM}-` },
        }).lean();

        const recordMap = {};
        for (const r of records) {
            recordMap[r.date] = r;
        }

        const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        let totalWorkingDays = 0;
        let presentDays = 0;
        let absentDays = 0;
        let lateDays = 0;
        let leaveDays = 0;
        let holidayDays = 0;
        let offDaysCount = 0;
        let totalOvertimeHours = 0;
        const dayByDayGrid = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${yearNum}-${padM}-${String(d).padStart(2, "0")}`;
            const dayOfWeek = WEEKDAY_NAMES[new Date(yearNum, monthNum - 1, d).getDay()];
            const isOffDay = offDays.includes(dayOfWeek);
            const isHoliday = holidaySet.has(dateStr);

            const rec = recordMap[dateStr];
            let dayStatus;

            if (isHoliday) {
                holidayDays++;
                dayStatus = "holiday";
            } else if (isOffDay) {
                offDaysCount++;
                dayStatus = "off-day";
            } else {
                totalWorkingDays++;
                if (rec) {
                    dayStatus = rec.status;
                    if (rec.status === "present") presentDays++;
                    else if (rec.status === "absent") absentDays++;
                    else if (rec.status === "late") { lateDays++; presentDays++; }
                    else if (rec.status === "leave") leaveDays++;
                    else if (rec.status === "half-day") presentDays++;
                    totalOvertimeHours += rec.overtime || 0;
                } else {
                    // No record for a working day — treat as absent
                    dayStatus = "absent";
                    absentDays++;
                }
            }

            dayByDayGrid.push({
                date: dateStr,
                status: dayStatus || (rec ? rec.status : "absent"),
                checkIn: rec?.checkIn || null,
                checkOut: rec?.checkOut || null,
                overtimeHours: rec?.overtime || 0,
            });
        }

        totalOvertimeHours = Math.round(totalOvertimeHours * 100) / 100;

        return res.status(200).send({
            status: true,
            data: {
                totalWorkingDays,
                presentDays,
                absentDays,
                lateDays,
                leaveDays,
                holidayDays,
                offDays: offDaysCount,
                totalOvertimeHours,
                dayByDayGrid,
            },
        });
    } catch (err) {
        return hrmsCatch(res, err, "Monthly summary load failed", "The monthly summary could not be loaded. Please try again.");
    }
};

// ─── Attendance Register ─────────────────────────────────────────────────────

/**
 * GET /HrAttendance/register
 * Req 6.12
 * Query: month, year, department, employeeId, format (csv|json)
 */
export const getAttendanceRegister = async (req, res) => {
    try {
        const { month, year, department, employeeId, format } = req.query;

        // Build employee filter
        const empFilter = {};
        if (department) empFilter.departmentId = department;

        // If a specific employee is requested, just confirm they match any dept filter
        let employeeIds = null;
        if (employeeId) {
            const emp = await EmployeeHrModal.findById(employeeId).select("_id departmentId").lean();
            if (!emp) {
                return hrmsFail(res, 404, "Employee not found", "No employee exists for this id.");
            }
            if (department && emp.departmentId?.toString() !== department) {
                return res.status(200).send({ status: true, data: [] });
            }
            employeeIds = [employeeId];
        } else if (department) {
            const emps = await EmployeeHrModal.find(empFilter).select("_id").lean();
            employeeIds = emps.map(e => e._id);
        }

        // Build attendance filter
        const attFilter = {};
        if (employeeIds) attFilter.employeeId = { $in: employeeIds };

        if (month && year) {
            const m = String(parseInt(month, 10)).padStart(2, "0");
            const y = parseInt(year, 10);
            attFilter.date = { $regex: `^${y}-${m}-` };
        } else if (year) {
            attFilter.date = { $regex: `^${parseInt(year, 10)}-` };
        } else if (month) {
            const m = String(parseInt(month, 10)).padStart(2, "0");
            attFilter.date = { $regex: `-${m}-` };
        }

        const records = await AttendanceHrModal.find(attFilter)
            .populate("employeeId", "code firstName lastName departmentId")
            .lean();

        if (format === "csv") {
            const header = "employee code,employee name,date,checkIn,checkOut,status,overtime\n";
            const csvRows = records.map(r => {
                const code = r.employeeId?.code || "";
                const name = r.employeeId
                    ? `${r.employeeId.firstName} ${r.employeeId.lastName || ""}`.trim()
                    : "";
                return [code, name, r.date, r.checkIn || "", r.checkOut || "", r.status, r.overtime ?? 0].join(",");
            });
            const csv = header + csvRows.join("\n");
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", "attachment; filename=attendance-register.csv");
            return res.status(200).send(csv);
        }

        return res.status(200).send({ status: true, data: records });
    } catch (err) {
        return hrmsCatch(res, err, "Attendance register load failed", "The attendance register could not be loaded. Please try again.");
    }
};

// ─── Attendance Dashboard ────────────────────────────────────────────────────

/**
 * GET /HrAttendance/dashboard
 * Query: month, year, department
 * Returns aggregated stats + daily heatmap data for the dashboard.
 */
export const getAttendanceDashboard = async (req, res) => {
    try {
        const monthNum = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);
        const yearNum = parseInt(req.query.year, 10) || new Date().getFullYear();
        const departmentId = req.query.department || null;

        if (monthNum < 1 || monthNum > 12) {
            return hrmsFail(res, 400, "Invalid value", "Month is not valid.");
        }

        // Build employee filter
        const empFilter = { status: "active" };
        if (departmentId) empFilter.departmentId = departmentId;

        const employees = await EmployeeHrModal.find(empFilter)
            .select("code firstName lastName departmentId policyTags.workWeek.offDays")
            .populate("departmentId", "name")
            .lean();

        // Fetch holidays for this month
        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum - 1, new Date(yearNum, monthNum, 0).getDate(), 23, 59, 59);
        const holidays = await HolidayCalendarModal.find({
            date: { $gte: monthStart, $lte: monthEnd },
        }).lean();
        const holidaySet = new Set(holidays.map(h => toLocalDateStr(h.date)));

        // Fetch all attendance for this month
        const padM = String(monthNum).padStart(2, "0");
        const empIds = employees.map(e => e._id);
        const records = await AttendanceHrModal.find({
            employeeId: { $in: empIds },
            date: { $regex: `^${yearNum}-${padM}-` },
        }).lean();

        // Build lookup: employeeId -> date -> record
        const recordMap = {};
        for (const r of records) {
            const eid = r.employeeId.toString();
            if (!recordMap[eid]) recordMap[eid] = {};
            recordMap[eid][r.date] = r;
        }

        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        // Aggregate stats
        let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalLeave = 0;
        let totalOffDays = 0, totalHolidays = 0, totalWorkingDays = 0;
        const departmentStats = {};
        const dailyHeatmap = [];

        for (const emp of employees) {
            const offDays = emp.policyTags?.workWeek?.offDays || ["Sunday"];
            const eid = emp._id.toString();
            const deptName = emp.departmentId?.name || "Unknown";

            if (!departmentStats[deptName]) {
                departmentStats[deptName] = { headcount: 0, present: 0, absent: 0, late: 0, leave: 0, workingDays: 0 };
            }
            departmentStats[deptName].headcount++;

            const empRow = { employee: `${emp.firstName} ${emp.lastName || ""}`.trim(), code: emp.code, days: [] };

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${yearNum}-${padM}-${String(d).padStart(2, "0")}`;
                const dayOfWeek = WEEKDAY_NAMES[new Date(yearNum, monthNum - 1, d).getDay()];
                const isOffDay = offDays.includes(dayOfWeek);
                const isHoliday = holidaySet.has(dateStr);

                const rec = recordMap[eid]?.[dateStr];
                let dayStatus;

                if (isHoliday) {
                    dayStatus = "holiday";
                    totalHolidays++;
                    totalOffDays++;
                } else if (isOffDay) {
                    dayStatus = "off-day";
                    totalOffDays++;
                } else {
                    totalWorkingDays++;
                    departmentStats[deptName].workingDays++;
                    if (rec) {
                        dayStatus = rec.status;
                        if (rec.status === "present") { totalPresent++; departmentStats[deptName].present++; }
                        else if (rec.status === "absent") { totalAbsent++; departmentStats[deptName].absent++; }
                        else if (rec.status === "late") { totalLate++; totalPresent++; departmentStats[deptName].late++; departmentStats[deptName].present++; }
                        else if (rec.status === "leave") { totalLeave++; departmentStats[deptName].leave++; }
                        else if (rec.status === "half-day") { totalPresent++; departmentStats[deptName].present++; }
                    } else {
                        dayStatus = "absent";
                        totalAbsent++;
                        departmentStats[deptName].absent++;
                    }
                }

                empRow.days.push({ date: dateStr, status: dayStatus });
            }
            dailyHeatmap.push(empRow);
        }

        return res.status(200).send({
            status: true,
            data: {
                month: monthNum,
                year: yearNum,
                summary: {
                    totalEmployees: employees.length,
                    totalWorkingDays,
                    present: totalPresent,
                    absent: totalAbsent,
                    late: totalLate,
                    leave: totalLeave,
                    offDays: totalOffDays,
                    holidays: totalHolidays,
                    attendanceRate: totalWorkingDays > 0
                        ? Math.round((totalPresent / (totalWorkingDays * employees.length)) * 100)
                        : 0,
                },
                departmentStats,
                dailyHeatmap,
                holidayList: holidays.map(h => ({
                    date: toLocalDateStr(h.date),
                    name: h.name,
                    province: h.province,
                })),
            },
        });
    } catch (err) {
        console.log("getAttendanceDashboard error:", err);
        return hrmsCatch(res, err, "Attendance dashboard load failed", "The attendance dashboard could not be loaded. Please try again.");
    }
};

// ─── ZKTeco Machine Sync ────────────────────────────────────────────────────

/**
 * POST /HrAttendance/sync-machine
 * Body: { ip: "192.168.1.100", port: 4370 }
 * Connects to ZKTeco machine and fetches attendance punches.
 */
/**
 * POST /HrAttendance/sync-machine
 * Body: { ip, port, startDate, endDate }
 */
export const syncFromMachine = async (req, res) => {
    try {
        const { ip, port = 4370, startDate, endDate } = req.body;

        if (!ip) {
            return hrmsFail(res, 400, "Missing fields", "Machine IP is required.");
        }

        console.log(`ZKTeco Sync: Connecting to ${ip}:${port}...`);

        const client = new ZKTecoClient(ip, port, 30000);

        try {
            await client.connect();
            console.log(`ZKTeco Sync: Connected to ${ip}:${port}`);
        } catch (err) {
            console.error(`ZKTeco Sync: Connection failed - ${err.message}`);
            return res.status(500).send({
                status: false,
                message: `Machine connection failed: Could not connect to the attendance machine at ${ip}:${port}.`
            });
        }

        // Fetch attendance with date range and user filter
        let punches;
        try {
            punches = await client.getAttendance({ startDate, endDate });
            console.log(`ZKTeco Sync: Fetched ${punches?.length || 0} punches`);
        } catch (err) {
            console.error(`ZKTeco Sync: Fetch failed - ${err.message}`);
            await client.disconnect();
            return res.status(500).send({
                status: false,
                message: "Punch download failed: The machine connected, but punches could not be read."
            });
        }

        await client.disconnect();

        if (!punches || punches.length === 0) {
            return res.status(200).send({
                status: true,
                message: "No new punches found",
                processed: 0,
                records: []
            });
        }

        // Convert punches to attendance using existing engine
        const policy = await CompanyPolicyModal.findOne() || {};
        const attendanceRecords = convertPunchesToAttendance(punches, policy);

        // Process and save
        let processed = 0;
        let skipped = 0;
        const errors = [];
        const empCache = new Map();

        for (const record of attendanceRecords) {
            const { employeeCode, date, checkIn, checkOut, status, overtime } = record;

            // Lookup employee
            if (!empCache.has(employeeCode)) {
                const emp = await EmployeeHrModal.findOne({ code: employeeCode }).select("_id").lean();
                empCache.set(employeeCode, emp || null);
            }
            const employee = empCache.get(employeeCode);

            if (!employee) {
                errors.push({ employeeCode, reason: "Employee not found" });
                continue;
            }

            // Check for existing record
            const existing = await AttendanceHrModal.findOne({
                employeeId: employee._id, date
            }).lean();

            if (existing) {
                skipped++;
                continue;
            }

            // Create attendance record
            await AttendanceHrModal.create({
                employeeId: employee._id,
                date,
                checkIn: checkIn || "",
                checkOut: checkOut || "",
                status: status || "present",
                overtime: overtime || 0,
                remarks: "ZKTeco sync",
            });

            processed++;
        }

        return res.status(200).send({
            status: true,
            message: `Sync complete: ${processed} new, ${skipped} skipped`,
            processed,
            skipped,
            errors,
            totalPunches: punches.length,
            records: attendanceRecords.slice(0, 10) // First 10 for preview
        });

    } catch (err) {
        console.log("syncFromMachine error:", err);
        return hrmsCatch(res, err, "Machine sync failed", "Attendance could not be read from the machine. Please try again.");
    }
};
