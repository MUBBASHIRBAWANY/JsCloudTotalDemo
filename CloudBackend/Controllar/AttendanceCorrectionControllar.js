import AttendanceCorrectionModal from "../modal/AttendanceCorrectionModal.js";
import AttendanceHrModal from "../modal/AttendanceHrModal.js";
import EmployeeHrModal from "../modal/EmployeeHrModal.js";
import { createNotification } from "./NotificationControllar.js";
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


export const submitCorrection = async (req, res) => {
    try {
        const { employeeId, attendanceId, date, requestedChanges, reason, attachmentUrl } = req.body;

        if (!employeeId || !date || !reason) {
            return hrmsFail(res, 400, "Missing fields", "Employee, date, and reason are required.");
        }

        const data = await AttendanceCorrectionModal.create({
            employeeId,
            attendanceId: attendanceId || undefined,
            date,
            requestedChanges: requestedChanges || {},
            reason,
            attachmentUrl: attachmentUrl || ""
        });

        // Notify HR about correction request
        const emp = await EmployeeHrModal.findById(employeeId).select("firstName lastName code");
        const empName = emp ? `${emp.firstName} ${emp.lastName || ""}`.trim() : "Employee";
        createNotification(null, "attendance", "correction_request", data._id,
            "Attendance Correction Request", `${empName} (${emp?.code || ""}) requested correction for ${date}`,
            "/HrAttendanceCorrection", "medium");

        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Correction update failed", "The correction could not be updated. Please try again.");
    }
};

export const approveCorrection = async (req, res) => {
    try {
        const { approverRemark } = req.body;
        if (!approverRemark) {
            return hrmsFail(res, 400, "Missing fields", "An approver remark is required.");
        }

        const correction = await AttendanceCorrectionModal.findById(req.params.id);
        if (!correction) return hrmsFail(res, 404, "Attendance correction not found", "No attendance correction exists for this id.");
        if (correction.status !== "pending") {
            return hrmsFail(res, 409, "Correction already decided", `This correction is already ${correction.status}.`);
        }

        // Apply changes to attendance record
        if (correction.attendanceId) {
            const updateFields = {};
            if (correction.requestedChanges.checkIn) updateFields.checkIn = correction.requestedChanges.checkIn;
            if (correction.requestedChanges.checkOut) updateFields.checkOut = correction.requestedChanges.checkOut;
            if (correction.requestedChanges.attendanceStatus) updateFields.attendanceStatus = correction.requestedChanges.attendanceStatus;
            if (correction.requestedChanges.workMode) updateFields.workMode = correction.requestedChanges.workMode;
            if (correction.requestedChanges.remarks) updateFields.remarks = correction.requestedChanges.remarks;

            await AttendanceHrModal.findByIdAndUpdate(correction.attendanceId, updateFields);
        } else {
            // Create new attendance record if none exists
            const newFields = {
                employeeId: correction.employeeId,
                date: correction.date,
                checkIn: correction.requestedChanges.checkIn || "",
                checkOut: correction.requestedChanges.checkOut || "",
                attendanceStatus: correction.requestedChanges.attendanceStatus || "present",
                workMode: correction.requestedChanges.workMode || "office",
                remarks: correction.requestedChanges.remarks || "corrected"
            };
            const existing = await AttendanceHrModal.findOne({ employeeId: correction.employeeId, date: correction.date });
            if (existing) {
                await AttendanceHrModal.findByIdAndUpdate(existing._id, newFields);
            } else {
                await AttendanceHrModal.create(newFields);
            }
        }

        correction.status = "approved";
        correction.approverRemark = approverRemark;
        correction.approvedAt = new Date();
        if (req.user?._id) correction.approverId = req.user._id;
        await correction.save();

        // Notify employee about approval
        createNotification(correction.employeeId, "attendance", "correction_approved", correction._id,
            "Attendance Correction Approved", `Your attendance correction for ${correction.date} has been approved`,
            "/HrAttendance", "high");

        res.status(200).send({ status: true, data: correction });
    } catch (err) {
        return hrmsCatch(res, err, "Correction update failed", "The correction could not be updated. Please try again.");
    }
};

export const rejectCorrection = async (req, res) => {
    try {
        const { approverRemark } = req.body;
        if (!approverRemark) {
            return hrmsFail(res, 400, "Missing fields", "An approver remark is required.");
        }

        const correction = await AttendanceCorrectionModal.findById(req.params.id);
        if (!correction) return hrmsFail(res, 404, "Attendance correction not found", "No attendance correction exists for this id.");
        if (correction.status !== "pending") {
            return hrmsFail(res, 409, "Correction already decided", `This correction is already ${correction.status}.`);
        }

        correction.status = "rejected";
        correction.approverRemark = approverRemark;
        correction.approvedAt = new Date();
        if (req.user?._id) correction.approverId = req.user._id;
        await correction.save();

        // Notify employee about rejection
        createNotification(correction.employeeId, "attendance", "correction_rejected", correction._id,
            "Attendance Correction Rejected", `Your attendance correction for ${correction.date} has been rejected. Reason: ${approverRemark}`,
            "/HrAttendance", "high");

        res.status(200).send({ status: true, data: correction });
    } catch (err) {
        return hrmsCatch(res, err, "Correction update failed", "The correction could not be updated. Please try again.");
    }
};

export const getCorrections = async (req, res) => {
    try {
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.employeeId) query.employeeId = req.query.employeeId;
        if (req.query.month && req.query.year) {
            const month = parseInt(req.query.month);
            const year = parseInt(req.query.year);
            const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
            const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;
            query.date = { $gte: startDate, $lte: endDate };
        }

        const data = await AttendanceCorrectionModal.find(query)
            .populate("employeeId", "firstName lastName code")
            .populate("approverId", "firstName lastName")
            .sort({ createdAt: -1 });

        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Corrections load failed", "The corrections could not be loaded. Please try again.");
    }
};
