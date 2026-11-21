import AttendanceHrModal from "../Modal/AttendanceHrModal.js";
import EmployeeHrModal from "../Modal/EmployeeHrModal.js";
import EmployeeLeaveBalanceModal from "../Modal/EmployeeLeaveBalanceModal.js";
import LeaveApplicationModal from "../Modal/LeaveApplicationModal.js";
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


function toLocalDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * GET /HrAttendance/report/daily?date=&department=&store=
 */
export const dailyReport = async (req, res) => {
    try {
        const { date, department, store } = req.query;
        if (!date) return hrmsFail(res, 400, "Missing fields", "Date is required.");

        const query = { date };
        const empQuery = { status: "active" };
        if (department) empQuery.departmentId = department;
        if (store) empQuery.storeId = store;

        const employees = await EmployeeHrModal.find(empQuery).select("_id code firstName lastName departmentId storeId");
        const empIds = employees.map(e => e._id);
        const attendance = await AttendanceHrModal.find({ employeeId: { $in: empIds }, date });

        const empMap = new Map(employees.map(e => [e._id.toString(), e]));
        const attMap = new Map(attendance.map(a => [a.employeeId.toString(), a]));

        const rows = employees.map(emp => {
            const att = attMap.get(emp._id.toString());
            return {
                employeeId: emp._id,
                code: emp.code,
                name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                department: emp.departmentId,
                store: emp.storeId,
                checkIn: att?.checkIn || "",
                checkOut: att?.checkOut || "",
                attendanceStatus: att?.attendanceStatus || "absent",
                workMode: att?.workMode || "",
                overtime: att?.overtime || 0
            };
        });

        res.status(200).send({ status: true, data: rows });
    } catch (err) {
        return hrmsCatch(res, err, "Daily report failed", "The daily report could not be completed. Please try again.");
    }
};

/**
 * GET /HrAttendance/report/monthly?month=&year=&department=&store=
 */
export const monthlyReport = async (req, res) => {
    try {
        const { month, year, department, store } = req.query;
        if (!month || !year) return hrmsFail(res, 400, "Missing fields", "Month and year are required.");

        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

        const empQuery = { status: "active" };
        if (department) empQuery.departmentId = department;
        if (store) empQuery.storeId = store;

        const employees = await EmployeeHrModal.find(empQuery).select("_id code firstName lastName departmentId storeId");
        const empIds = employees.map(e => e._id);
        const attendance = await AttendanceHrModal.find({ employeeId: { $in: empIds }, date: { $gte: startDate, $lte: endDate } });

        const empMap = new Map(employees.map(e => [e._id.toString(), e]));
        const empAttMap = new Map();
        for (const a of attendance) {
            const key = a.employeeId.toString();
            if (!empAttMap.has(key)) empAttMap.set(key, []);
            empAttMap.get(key).push(a);
        }

        const rows = employees.map(emp => {
            const records = empAttMap.get(emp._id.toString()) || [];
            const present = records.filter(r => r.attendanceStatus === "present" || r.status === "late").length;
            const late = records.filter(r => r.status === "late").length;
            const absent = records.filter(r => r.attendanceStatus === "absent").length;
            const leave = records.filter(r => r.attendanceStatus === "leave").length;
            const overtime = records.reduce((s, r) => s + (r.overtime || 0), 0);

            return {
                employeeId: emp._id,
                code: emp.code,
                name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                department: emp.departmentId,
                store: emp.storeId,
                present, late, absent, leave, overtime: Math.round(overtime * 100) / 100
            };
        });

        res.status(200).send({ status: true, data: rows });
    } catch (err) {
        return hrmsCatch(res, err, "Monthly report failed", "The monthly report could not be completed. Please try again.");
    }
};

/**
 * GET /HrAttendance/report/late?month=&year=&department=
 */
export const lateReport = async (req, res) => {
    try {
        const { month, year, department } = req.query;
        if (!month || !year) return hrmsFail(res, 400, "Missing fields", "Month and year are required.");

        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

        const empQuery = { status: "active" };
        if (department) empQuery.departmentId = department;

        const employees = await EmployeeHrModal.find(empQuery).select("_id code firstName lastName");
        const empIds = employees.map(e => e._id);
        const lateRecords = await AttendanceHrModal.find({ employeeId: { $in: empIds }, date: { $gte: startDate, $lte: endDate }, status: "late" });

        const empMap = new Map(employees.map(e => [e._id.toString(), e]));
        const grouped = {};
        for (const rec of lateRecords) {
            const emp = empMap.get(rec.employeeId.toString());
            if (!emp) continue;
            if (!grouped[rec.employeeId]) {
                grouped[rec.employeeId] = { code: emp.code, name: `${emp.firstName} ${emp.lastName || ""}`.trim(), count: 0, dates: [] };
            }
            grouped[rec.employeeId].count++;
            grouped[rec.employeeId].dates.push(rec.date);
        }

        res.status(200).send({ status: true, data: Object.values(grouped) });
    } catch (err) {
        return hrmsCatch(res, err, "Late report failed", "The late report could not be completed. Please try again.");
    }
};

/**
 * GET /HrLeave/report/balance?year=&employee=&department=
 */
export const leaveBalanceReport = async (req, res) => {
    try {
        const { year, employee, department } = req.query;
        const empQuery = { status: "active" };
        if (employee) empQuery._id = employee;
        if (department) empQuery.departmentId = department;

        const employees = await EmployeeHrModal.find(empQuery).select("_id code firstName lastName");
        const empIds = employees.map(e => e._id);
        const balances = await EmployeeLeaveBalanceModal.find({ employeeId: { $in: empIds }, year: parseInt(year) })
            .populate("leaveTypeId", "name code color");

        const empMap = new Map(employees.map(e => [e._id.toString(), e]));
        const grouped = {};
        for (const bal of balances) {
            const emp = empMap.get(bal.employeeId.toString());
            if (!emp) continue;
            if (!grouped[bal.employeeId]) {
                grouped[bal.employeeId] = { code: emp.code, name: `${emp.firstName} ${emp.lastName || ""}`.trim(), balances: [] };
            }
            grouped[bal.employeeId].balances.push({
                leaveType: bal.leaveTypeId?.name || "Unknown",
                code: bal.leaveTypeId?.code || "",
                color: bal.leaveTypeId?.color || "#6B7280",
                allocated: bal.allocated,
                used: bal.used,
                carriedForward: bal.carriedForward,
                balance: bal.balance
            });
        }

        res.status(200).send({ status: true, data: Object.values(grouped) });
    } catch (err) {
        return hrmsCatch(res, err, "Leave balance report failed", "The leave balance report could not be completed. Please try again.");
    }
};
