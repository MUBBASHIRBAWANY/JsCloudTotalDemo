import CompanyPolicyModal from "../Modal/CompanyPolicyModal.js";
import HolidayCalendarModal from "../Modal/HolidayCalendarModal.js";
import EmployeeHrModal from "../Modal/EmployeeHrModal.js";
import AttendanceHrModal from "../Modal/AttendanceHrModal.js";
import LoanModal from "../Modal/LoanModal.js";
import LeaveTypeModal from "../Modal/LeaveTypeModal.js";
import EmployeeLeaveBalanceModal from "../Modal/EmployeeLeaveBalanceModal.js";
import PayrollModal from "../Modal/PayrollModal.js";
import MonthlyTransactionModal from "../Modal/MonthlyTransactionModal.js";
import PayrollAdjustmentModal from "../Modal/PayrollAdjustmentModal.js";
import LoanRepaymentLogModal from "../Modal/LoanRepaymentLogModal.js";
import AttendanceMonthLockModal from "../Modal/AttendanceMonthLockModal.js";
import SalaryAdvance from "../Modal/SalaryAdvanceModal.js";
import SalaryAdvanceRecovery from "../Modal/SalaryAdvanceRecoveryModal.js";
import StaffLoan from "../Modal/StaffLoanModal.js";
import StaffLoanRecovery from "../Modal/StaffLoanRecoveryModal.js";
import AllowanceTypeModal from "../Modal/AllowanceTypeModal.js";

function parseTime(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}

function isOffDay(date, offDays) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return offDays.includes(dayNames[date.getDay()]);
}

function roundToWhole(num) {
    return Math.round(num);
}

function toLocalDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export async function calculateMonthlyPayroll(employeeId, month, year) {
    // Check if attendance month is locked (payroll should not run on unfinalized data)
    const attendanceLock = await AttendanceMonthLockModal.findOne({ month, year });
    if (attendanceLock && attendanceLock.locked) {
        throw new Error(`Attendance is locked for ${month}/${year}. Cannot generate payroll.`);
    }

    const employee = await EmployeeHrModal.findById(employeeId);
    if (!employee || employee.status !== "active") return null;

    const policy = await CompanyPolicyModal.findOne() || await CompanyPolicyModal.create({});
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month - 1, totalDaysInMonth);

    const shiftStartMinutes = parseTime(policy.shiftStart);
    const shiftEndMinutes = parseTime(policy.shiftEnd);
    const graceMinutes = policy.gracePeriodMinutes;
    const earlyDepartureGrace = policy.earlyDepartureGraceMinutes || 0;
    const maxLateDays = policy.maxLateDaysPerMonth || 0;
    const autoHalfDayAfter = policy.autoHalfDayAfterMinutes || 0;
    const autoAbsentAfter = policy.autoAbsentAfterMinutes || 0;

    const attendance = await AttendanceHrModal.find({
        employeeId,
        date: { $gte: toLocalDateStr(startDate), $lte: toLocalDateStr(endDate) }
    });

    const holidays = await HolidayCalendarModal.find({
        date: { $gte: startDate, $lte: endDate },
        $or: [
            { province: employee.policyTags.province, applicableReligion: employee.policyTags.religion },
            { province: "All", applicableReligion: employee.policyTags.religion },
            { province: employee.policyTags.province, applicableReligion: "All" },
            { province: "All", applicableReligion: "All" }
        ]
    });
    const holidayDates = new Set(holidays.map(h => toLocalDateStr(h.date)));

    const employeeOffDays = employee.policyTags?.workWeek?.offDays?.length > 0
        ? employee.policyTags.workWeek.offDays
        : (policy.workWeek?.offDays || ["Sunday"]);

    // Salary rates — always calendar days
    const basicSalary = employee.salarySetupBasket.basicSalary;

    // Fetch allowance types to distinguish per_month vs per_day
    const empAllowances = (employee.salarySetupBasket.allowances && Array.isArray(employee.salarySetupBasket.allowances))
        ? employee.salarySetupBasket.allowances : [];
    const allowanceTypeIds = empAllowances.map(a => a.typeId).filter(Boolean);
    const allowanceTypes = allowanceTypeIds.length > 0
        ? await AllowanceTypeModal.find({ _id: { $in: allowanceTypeIds } }) : [];
    const typeMap = {};
    for (const at of allowanceTypes) typeMap[at._id.toString()] = at.type;

    // Split: per_month (fixed) vs per_day (variable)
    let totalPerMonthAllowances = 0;
    let totalPerDayAllowances = 0;
    for (const a of empAllowances) {
        const t = typeMap[a.typeId?.toString()] || "per_month";
        if (t === "per_day") {
            totalPerDayAllowances += a.amount || 0;
        } else {
            totalPerMonthAllowances += a.amount || 0;
        }
    }

    // Base rate for deductions (late, absent, early departure) uses only fixed components
    const totalSalary = basicSalary + totalPerMonthAllowances;
    const workingHours = employee.workingHours || 9;
    const perDayRate = roundToWhole(totalSalary / totalDaysInMonth);
    const perHourRate = roundToWhole(perDayRate / workingHours);
    const perMinuteRate = roundToWhole(perHourRate / 60);

    // Attendance counters
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let leaveDays = 0;
    let holidayDaysCount = 0;
    let offDaysCount = 0;
    let extraDays = 0;
    let totalOvertime = 0;
    let totalLateMinutes = 0;
    let totalEarlyMinutes = 0;
    let leavesTakenThisMonth = 0;
    const freeLeavePerMonth = policy.freeLeavePerMonth || 0;

    // Single pass through every calendar day
    for (let d = 1; d <= totalDaysInMonth; d++) {
        const currentDate = new Date(year, month - 1, d);
        const dateStr = toLocalDateStr(currentDate);

        // Holiday: count only, never absent, never present, no deduction
        if (holidayDates.has(dateStr)) {
            holidayDaysCount++;
            continue;
        }

        // Weekly off: check if employee worked (extra day)
        if (isOffDay(currentDate, employeeOffDays)) {
            const dayRecord = attendance.find(a => a.date === dateStr);
            if (dayRecord && (dayRecord.attendanceStatus === "present" || dayRecord.status === "late")) {
                // Employee worked on off day → extra day
                extraDays++;
                presentDays++;
            } else {
                offDaysCount++;
            }
            continue;
        }

        // Working day — look for an attendance record
        const dayRecord = attendance.find(a => a.date === dateStr);

        // No record or explicit "absent" → absent
        if (!dayRecord || dayRecord.attendanceStatus === "absent") {
            absentDays++;
            continue;
        }

        // Leave handling
        if (dayRecord.attendanceStatus === "leave") {
            // New path: attendance record has leaveTypeId linked from approved LeaveApplication
            if (dayRecord.leaveTypeId) {
                const lt = await LeaveTypeModal.findById(dayRecord.leaveTypeId);
                if (lt && lt.isPaid) {
                    // Paid leave — check EmployeeLeaveBalance and deduct
                    const balance = await EmployeeLeaveBalanceModal.findOne({
                        employeeId, leaveTypeId: dayRecord.leaveTypeId, year
                    });
                    if (balance && (balance.allocated + balance.carriedForward - balance.used) > 0) {
                        balance.used += 1;
                        balance.balance -= 1;
                        await balance.save();
                    }
                    leaveDays++;
                } else {
                    // Unpaid leave → treated as absent for salary
                    absentDays++;
                }
            } else {
                // Legacy path: no leaveTypeId on attendance record
                const leaveType = "casual";
                const bucket = employee.leaveBucket[leaveType];

                if (leavesTakenThisMonth < freeLeavePerMonth) {
                    leavesTakenThisMonth++;
                    leaveDays++;
                } else if (bucket && bucket.balance > 0) {
                    bucket.used += 1;
                    bucket.balance -= 1;
                    leavesTakenThisMonth++;
                    leaveDays++;
                } else {
                    absentDays++;
                }
            }
            continue;
        }

        // Present or Late — late is still present for salary
        if (dayRecord.attendanceStatus === "present" || dayRecord.status === "late") {
            presentDays++;

            if (dayRecord.checkIn && shiftStartMinutes !== null) {
                const checkInMinutes = parseTime(dayRecord.checkIn);
                if (checkInMinutes && checkInMinutes > shiftStartMinutes + graceMinutes) {
                    if (!dayRecord.informed) {
                        const lateMins = checkInMinutes - shiftStartMinutes;
                        totalLateMinutes += lateMins;
                        lateDays++;
                    }
                }
            }

            // Early departure detection
            if (dayRecord.checkOut && shiftEndMinutes !== null) {
                const checkOutMinutes = parseTime(dayRecord.checkOut);
                if (checkOutMinutes && checkOutMinutes < shiftEndMinutes - earlyDepartureGrace) {
                    const earlyMins = shiftEndMinutes - checkOutMinutes;
                    totalEarlyMinutes += earlyMins;
                }
            }

            totalOvertime += dayRecord.overtime || 0;
        } else if (dayRecord.attendanceStatus === "half_day" || dayRecord.status === "half-day") {
            presentDays += 0.5;
            absentDays += 0.5;
        }
    }

    await EmployeeHrModal.findByIdAndUpdate(employeeId, { leaveBucket: employee.leaveBucket });

    // Deductions
    // Apply late thresholds: auto-convert late to half-day or absent if thresholds exceeded
    let adjustedLateMinutes = totalLateMinutes;
    let adjustedAbsentDays = absentDays;
    let adjustedPresentDays = presentDays;

    if (autoAbsentAfter > 0 && totalLateMinutes >= autoAbsentAfter) {
        // Late minutes exceed auto-absent threshold → treat as absent
        adjustedAbsentDays += 1;
        adjustedPresentDays -= 1;
        adjustedLateMinutes = 0;
    } else if (autoHalfDayAfter > 0 && totalLateMinutes >= autoHalfDayAfter) {
        // Late minutes exceed auto half-day threshold → treat as half-day
        adjustedPresentDays -= 0.5;
        adjustedAbsentDays += 0.5;
    }

    const latePenalty = roundToWhole(adjustedLateMinutes * perMinuteRate);
    const earlyDeparturePenalty = roundToWhole(totalEarlyMinutes * perMinuteRate);
    const absentDeduction = roundToWhole(adjustedAbsentDays * perDayRate);

    // Build allowances display array
    const allowancesArr = [];
    let calculatedPerDayAllowances = 0;
    if (employee.salarySetupBasket.allowances && Array.isArray(employee.salarySetupBasket.allowances)) {
        for (const a of employee.salarySetupBasket.allowances) {
            if (a.amount > 0) {
                const t = typeMap[a.typeId?.toString()] || "per_month";
                if (t === "per_day") {
                    // Per day: daily rate × present days
                    const perDayTotal = roundToWhole(a.amount * presentDays);
                    calculatedPerDayAllowances += perDayTotal;
                    allowancesArr.push({ name: a.name || a.code, amount: perDayTotal, code: a.code, type: "per_day", baseAmount: a.amount });
                } else {
                    // Per month: always full amount
                    allowancesArr.push({ name: a.name || a.code, amount: a.amount, code: a.code, type: "per_month" });
                }
            }
        }
    }
    if (employee.salaryLines && employee.salaryLines.length > 0) {
        for (const line of employee.salaryLines) {
            if (line.type === "earning" && line.amount > 0) {
                allowancesArr.push({ name: line.description || line.code, amount: line.amount, code: line.code });
            }
        }
    }
    const monthlyTxns = await MonthlyTransactionModal.find({ employeeId, month, year });
    for (const txn of monthlyTxns.filter(t => t.type === "earning")) {
        allowancesArr.push({ name: txn.description, amount: txn.amount, code: txn.code });
    }

    // Attendance Allowance: based on gross salary per day (basic + all allowances)
    let attendanceAllowanceAmount = 0;
    if (employee.attendanceAllowance && adjustedAbsentDays === 0 && leaveDays === 0) {
        const multiplier = employee.attendanceAllowancePerDay || 1;
        // Gross per day = (basic + per_month allowances + per_day allowances) / totalDaysInMonth
        const grossForAttendance = basicSalary + totalPerMonthAllowances + calculatedPerDayAllowances;
        const grossPerDay = roundToWhole(grossForAttendance / totalDaysInMonth);
        attendanceAllowanceAmount = roundToWhole(grossPerDay * multiplier);
        if (attendanceAllowanceAmount > 0) {
            allowancesArr.push({
                name: "Attendance Allowance",
                amount: attendanceAllowanceAmount,
                code: "ATT_ALLOW",
                type: "attendance_allowance"
            });
        }
    }

    // Also read PayrollAdjustment records (bonus, arrear, advance-recovery, other)
    const adjustments = await PayrollAdjustmentModal.find({ employeeId, month, year });
    for (const adj of adjustments) {
        if (adj.type === "bonus" || adj.type === "arrear") {
            allowancesArr.push({ name: adj.description || adj.type, amount: adj.amount });
        } else if (adj.type === "advance-recovery") {
            // Manual advance recovery — add as a deduction
            deductionsArr.push({ name: "Advance Recovery", amount: adj.amount });
        } else if (adj.type === "other") {
            // Determine if earning or deduction based on amount sign
            if (adj.amount > 0) {
                allowancesArr.push({ name: adj.description || "Other Adjustment", amount: adj.amount });
            } else {
                deductionsArr.push({ name: adj.description || "Other Adjustment", amount: Math.abs(adj.amount) });
            }
        }
    }

    const totalAllowances = roundToWhole(allowancesArr.reduce((s, a) => s + a.amount, 0));

    const overtimePay = roundToWhole(totalOvertime * perHourRate * policy.overtimeMultiplier);

    // Extra day pay: employee worked on off day
    const extraDayPay = roundToWhole(extraDays * perDayRate);

    // Gross salary = basic + per_month allowances + per_day allowances (pro-rata) + overtime + extra day pay + attendance allowance
    const grossSalary = roundToWhole(basicSalary + totalPerMonthAllowances + calculatedPerDayAllowances + overtimePay + extraDayPay + attendanceAllowanceAmount);

    // Build deductions array
    const deductionsArr = [];
    if (absentDeduction > 0) deductionsArr.push({ name: "Absent Deduction", amount: absentDeduction });
    if (latePenalty > 0) deductionsArr.push({ name: "Late Penalty", amount: latePenalty });
    if (earlyDeparturePenalty > 0) deductionsArr.push({ name: "Early Departure Penalty", amount: earlyDeparturePenalty });

    if (employee.salarySetupBasket.deductions && Array.isArray(employee.salarySetupBasket.deductions)) {
        for (const d of employee.salarySetupBasket.deductions) {
            if (d.amount > 0) deductionsArr.push({ name: d.name || d.code, amount: d.amount, code: d.code });
        }
    }
    if (employee.salaryLines && employee.salaryLines.length > 0) {
        for (const line of employee.salaryLines) {
            if (line.type === "deduction" && line.amount > 0) deductionsArr.push({ name: line.description || line.code, amount: line.amount, code: line.code });
        }
    }
    for (const txn of monthlyTxns.filter(t => t.type === "deduction")) {
        deductionsArr.push({ name: txn.description, amount: txn.amount, code: txn.code });
    }

    if (policy.eobiEmployeeShare > 0) {
        deductionsArr.push({ name: "EOBI (Employee)", amount: policy.eobiEmployeeShare });
    }

    if (policy.socialSecurityRate > 0) {
        const ssDeduction = roundToWhole(basicSalary * policy.socialSecurityRate / 100);
        if (ssDeduction > 0) {
            deductionsArr.push({ name: "Social Security", amount: ssDeduction });
        }
    }

    // EBF (Employee Benevolent Fund) deduction
    if (policy.ebfEmployeeRate > 0) {
        const ebfDeduction = roundToWhole(basicSalary * policy.ebfEmployeeRate / 100);
        if (ebfDeduction > 0) {
            deductionsArr.push({ name: "EBF (Employee)", amount: ebfDeduction });
        }
    }

    // --- SALARY ADVANCE RECOVERY ---
    const advances = await SalaryAdvance.find({ employeeId, status: "paid" });
    for (const adv of advances) {
        const recovered = await SalaryAdvanceRecovery.aggregate([
            { $match: { advanceId: adv._id } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalRecovered = recovered[0]?.total || 0;
        const outstanding = adv.amount - totalRecovered;
        if (outstanding <= 0) continue;

        const currentDeductions = deductionsArr.reduce((s, d) => s + d.amount, 0);
        const availableForAdvance = Math.max(0, grossSalary - currentDeductions);
        const recoveryAmount = Math.min(outstanding, availableForAdvance);
        if (recoveryAmount <= 0) continue;

        deductionsArr.push({ name: "Advance Recovery", amount: recoveryAmount });

        // Update advance status if fully recovered
        const newOutstanding = outstanding - recoveryAmount;
        if (newOutstanding <= 0) {
            adv.status = "recovered";
            adv.recoveredAt = new Date();
            await adv.save();
        }

        await SalaryAdvanceRecovery.create({
            advanceId: adv._id,
            payrollId: null, // Will be set after payroll record is created
            month, year,
            amount: recoveryAmount,
            recoveredAt: new Date()
        });
    }

    // --- STAFF LOAN RECOVERY ---
    const loans = await StaffLoan.find({ employeeId, status: "active" });
    for (const loan of loans) {
        const recovered = await StaffLoanRecovery.aggregate([
            { $match: { loanId: loan._id } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalRecovered = recovered[0]?.total || 0;
        const outstanding = loan.requestedAmount - totalRecovered;
        if (outstanding <= 0) {
            loan.status = "settled";
            loan.closedAt = new Date();
            await loan.save();
            continue;
        }

        const currentDeductions = deductionsArr.reduce((s, d) => s + d.amount, 0);
        const availableForLoan = Math.max(0, grossSalary - currentDeductions);
        const recoveryAmount = Math.min(loan.monthlyInstallment || 0, availableForLoan);
        if (recoveryAmount <= 0) continue;

        deductionsArr.push({ name: "Loan Recovery", amount: recoveryAmount });

        // Update loan outstanding balance
        loan.outstandingBalance = outstanding - recoveryAmount;
        if (loan.outstandingBalance <= 0) {
            loan.status = "settled";
            loan.closedAt = new Date();
        }
        await loan.save();

        await StaffLoanRecovery.create({
            loanId: loan._id,
            payrollId: null, // Will be set after payroll record is created
            month, year,
            amount: recoveryAmount,
            recoveredAt: new Date()
        });
    }

    if (policy.incomeTaxEnabled && policy.taxSlabs?.length > 0) {
        let taxAmount = 0;
        for (const slab of policy.taxSlabs) {
            if (grossSalary > slab.from && slab.percentage > 0) {
                const taxableInSlab = Math.min(grossSalary, slab.to) - slab.from;
                if (taxableInSlab > 0) {
                    taxAmount += roundToWhole(taxableInSlab * slab.percentage / 100);
                }
            }
        }
        if (taxAmount > 0) {
            deductionsArr.push({ name: "Income Tax", amount: taxAmount });
        }
    }

    const totalDeductions = roundToWhole(deductionsArr.reduce((s, d) => s + d.amount, 0));
    const netSalary = roundToWhole(grossSalary - totalDeductions);

    const result = {
        employeeId, month, year,
        totalDaysInMonth,
        presentDays, absentDays, lateDays, leaveDays,
        holidayDays: holidayDaysCount, offDays: offDaysCount,
        extraDays, extraDayPay,
        overtimeHours: totalOvertime, overtimeRate: perHourRate, overtimePay,
        perDayRate, perMinuteRate, basicSalary, totalSalary,
        totalLateMinutes, totalEarlyMinutes,
        attendanceAllowance: attendanceAllowanceAmount,
        allowances: allowancesArr, totalAllowances,
        deductions: deductionsArr, totalDeductions,
        latePenalty, earlyDeparturePenalty, absentDeduction,
        grossSalary, netSalary,
        status: "draft"
    };

    return result;
}
