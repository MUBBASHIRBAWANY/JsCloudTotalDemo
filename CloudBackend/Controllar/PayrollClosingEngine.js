import PayrollModal from "../modal/PayrollModal.js";
import EmployeeHrModal from "../modal/EmployeeHrModal.js";
import PayrollAccountMapping from "../modal/PayrollAccountMapping.js";
import VoucherModal from "../modal/VoucherModal.js";
import PayrollAuditLog from "../modal/PayrollAuditLog.js";
import CompanyPolicyModal from "../modal/CompanyPolicyModal.js";

const FIELD_LABELS = {
    salaryExpense: "Salary Expense",
    salaryPayable: "Salary Payable",
    ebfEmployee: "EBF (Employee)",
    ebfCompany: "EBF (Company)",
    employeeLoan: "Employee Loan",
    salaryAdvance: "Salary Advance",
    ebfExpense: "EBF Expense (Company)"
};

function validateMappings(mapping, totalGross, totalNet, loanDetails, totalEbfEmployee, totalEbfCompany) {
    const missing = [];

    // Core mappings
    if (!mapping.salaryExpense?.code) {
        missing.push({ field: "salaryExpense", label: FIELD_LABELS.salaryExpense, amount: totalGross });
    }
    if (!mapping.salaryPayable?.code) {
        missing.push({ field: "salaryPayable", label: FIELD_LABELS.salaryPayable, amount: totalNet });
    }

    // EBF mappings
    if (totalEbfEmployee > 0 && !mapping.ebfEmployee?.code) {
        missing.push({ field: "ebfEmployee", label: FIELD_LABELS.ebfEmployee, amount: totalEbfEmployee });
    }
    if (totalEbfCompany > 0 && !mapping.ebfCompany?.code) {
        missing.push({ field: "ebfCompany", label: FIELD_LABELS.ebfCompany, amount: totalEbfCompany });
    }

    // Loan and advance
    const loanAmount = loanDetails.filter(l => !l.isAdvance).reduce((s, l) => s + l.amount, 0);
    const advanceAmount = loanDetails.filter(l => l.isAdvance).reduce((s, l) => s + l.amount, 0);

    if (loanAmount > 0 && !mapping.employeeLoan?.code) {
        missing.push({ field: "employeeLoan", label: FIELD_LABELS.employeeLoan, amount: loanAmount });
    }
    if (advanceAmount > 0 && !mapping.salaryAdvance?.code) {
        missing.push({ field: "salaryAdvance", label: FIELD_LABELS.salaryAdvance, amount: advanceAmount });
    }

    return missing;
}

function formatMissingMappingsError(missing) {
    const items = missing.map(m =>
        `\u2022 ${m.label}\n  Amount: Rs. ${Math.round(m.amount)}`
    ).join("\n\n");

    return `Payroll cannot be closed.\n\nMissing Account Mappings:\n\n${items}\n\nGo to:\nPayroll Settings \u2192 Account Mapping\nand configure the missing accounts.`;
}

function roundToWhole(num) {
    return Math.round(num);
}

function getAccountCode(mapping, field) {
    const acct = mapping[field];
    if (!acct || !acct.code) {
        throw new Error(`Account mapping missing for: ${field}. Configure in Payroll Settings.`);
    }
    return { code: acct.code, name: acct.name };
}

function getNextVoucherNumber(month, year) {
    const m = String(month).padStart(2, "0");
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    return `JV-${year}-${m}-${rand}`;
}

// ─── MAIN: Close Payroll for a Month ─────────────────────────────
export async function closePayrollMonth(month, year, userId, ip = "") {
    // 1. Fetch all paid payroll records for this month
    const payrolls = await PayrollModal.find({ month, year, status: "paid" });
    if (payrolls.length === 0) {
        return { success: false, message: "No paid payroll records found for this period." };
    }

    // 2. Check if already closed
    const alreadyClosed = payrolls.filter(p => p.journalVoucherId);
    if (alreadyClosed.length === payrolls.length) {
        return { success: false, message: "Payroll already closed for this period." };
    }

    // 3. Only process records not yet closed
    const toClose = payrolls.filter(p => !p.journalVoucherId);

    // 4. Fetch account mapping
    const mapping = await PayrollAccountMapping.findOne();
    if (!mapping) {
        throw new Error("Payroll Account Mapping not configured. Set it in Payroll Settings.");
    }

    // 5. Fetch employee data for store grouping
    const employeeIds = [...new Set(toClose.map(p => p.employeeId.toString()))];
    const employees = await EmployeeHrModal.find({ _id: { $in: employeeIds } });
    const employeeMap = new Map();
    for (const emp of employees) {
        employeeMap.set(emp._id.toString(), emp);
    }

    // 6. Pre-calculate amounts for validation
    const monthNames = ["", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    const narration = `Payroll Closing for ${monthNames[month]} ${year}`;

    // Calculate total gross by store
    const salaryByStore = {};
    let totalGross = 0;
    for (const p of toClose) {
        const emp = employeeMap.get(p.employeeId.toString());
        const storeId = emp?.storeId || "UNASSIGNED";
        if (!salaryByStore[storeId]) salaryByStore[storeId] = 0;
        salaryByStore[storeId] += p.grossSalary || 0;
        totalGross += p.grossSalary || 0;
    }

    // Calculate total net
    let totalNet = 0;
    for (const p of toClose) {
        totalNet += p.netSalary || 0;
    }

    // Calculate deductions by type
    const loanDetails = [];
    let totalEbfEmployee = 0;
    let totalEbfCompany = 0;

    for (const p of toClose) {
        const emp = employeeMap.get(p.employeeId.toString());
        if (!p.deductions || !Array.isArray(p.deductions)) continue;

        for (const d of p.deductions) {
            const name = (d.name || "").toLowerCase();

            if (name.includes("loan")) {
                loanDetails.push({
                    employeeCode: emp?.code,
                    employeeName: `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim(),
                    amount: d.amount || 0,
                    isAdvance: false
                });
                continue;
            }
            if (name.includes("advance")) {
                loanDetails.push({
                    employeeCode: emp?.code,
                    employeeName: `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim(),
                    amount: d.amount || 0,
                    isAdvance: true
                });
                continue;
            }
            if (name.includes("ebf") && name.includes("employee")) {
                totalEbfEmployee += d.amount || 0;
                continue;
            }
        }
    }

    // Calculate employer EBF contribution
    const policy = await CompanyPolicyModal.findOne();
    const ebfCompanyRate = policy?.ebfCompanyRate || 5;
    totalEbfCompany = roundToWhole(totalGross * ebfCompanyRate / 100);

    // 7. VALIDATE ALL MAPPINGS BEFORE BUILDING JOURNAL LINES
    const missingMappings = validateMappings(
        mapping, totalGross, totalNet, loanDetails, totalEbfEmployee, totalEbfCompany
    );

    if (missingMappings.length > 0) {
        throw new Error(formatMissingMappingsError(missingMappings));
    }

    // 8. Build journal lines (all mappings validated)
    const journalLines = [];

    // DEBIT: Salary Expense grouped by Store
    const salaryExpense = getAccountCode(mapping, "salaryExpense");
    for (const [storeId, gross] of Object.entries(salaryByStore)) {
        if (gross > 0) {
            journalLines.push({
                AccountCode: salaryExpense.code,
                AccountName: salaryExpense.name,
                Debit: String(roundToWhole(gross)),
                Credit: "0",
                CostCenter: storeId,
                Narration: narration
            });
        }
    }

    // DEBIT: EBF Expense (Company contribution)
    if (totalEbfCompany > 0) {
        const ebfExpenseAcct = getAccountCode(mapping, "ebfExpense");
        journalLines.push({
            AccountCode: ebfExpenseAcct.code,
            AccountName: ebfExpenseAcct.name,
            Debit: String(totalEbfCompany),
            Credit: "0",
            Narration: `EBF Company Contribution - ${monthNames[month]} ${year}`
        });
    }

    // CREDIT: EBF Company (liability for employer contribution)
    if (totalEbfCompany > 0) {
        const ebfCompanyAcct = getAccountCode(mapping, "ebfCompany");
        journalLines.push({
            AccountCode: ebfCompanyAcct.code,
            AccountName: ebfCompanyAcct.name,
            Debit: "0",
            Credit: String(totalEbfCompany),
            Narration: `EBF Company Payable - ${monthNames[month]} ${year}`
        });
    }

    // CREDIT: EBF Employee (deduction from employee)
    if (totalEbfEmployee > 0) {
        const ebfEmployeeAcct = getAccountCode(mapping, "ebfEmployee");
        journalLines.push({
            AccountCode: ebfEmployeeAcct.code,
            AccountName: ebfEmployeeAcct.name,
            Debit: "0",
            Credit: String(roundToWhole(totalEbfEmployee)),
            Narration: `EBF Employee Deduction - ${monthNames[month]} ${year}`
        });
    }

    // CREDIT: Salary Payable (total net salary)
    if (totalNet > 0) {
        const salaryPayable = getAccountCode(mapping, "salaryPayable");
        journalLines.push({
            AccountCode: salaryPayable.code,
            AccountName: salaryPayable.name,
            Debit: "0",
            Credit: String(roundToWhole(totalNet)),
            Narration: `Net Salary Payable - ${monthNames[month]} ${year}`
        });
    }

    // CREDIT: Employee Loan (single line, all loans combined)
    const totalLoan = loanDetails.filter(l => !l.isAdvance).reduce((s, l) => s + l.amount, 0);
    if (totalLoan > 0) {
        const loanAcct = getAccountCode(mapping, "employeeLoan");
        const loanEmployees = loanDetails
            .filter(l => !l.isAdvance && l.amount > 0)
            .map(l => `${l.employeeCode} - ${l.employeeName}`)
            .join(", ");

        journalLines.push({
            AccountCode: loanAcct.code,
            AccountName: loanAcct.name,
            Debit: "0",
            Credit: String(roundToWhole(totalLoan)),
            EmployeeReference: loanEmployees,
            Narration: `Loan Recovery - ${monthNames[month]} ${year}`
        });
    }

    // CREDIT: Salary Advance (single line, all advances combined)
    const totalAdvance = loanDetails.filter(l => l.isAdvance).reduce((s, l) => s + l.amount, 0);
    if (totalAdvance > 0) {
        const advanceAcct = getAccountCode(mapping, "salaryAdvance");
        const advanceEmployees = loanDetails
            .filter(l => l.isAdvance && l.amount > 0)
            .map(l => `${l.employeeCode} - ${l.employeeName}`)
            .join(", ");

        journalLines.push({
            AccountCode: advanceAcct.code,
            AccountName: advanceAcct.name,
            Debit: "0",
            Credit: String(roundToWhole(totalAdvance)),
            EmployeeReference: advanceEmployees,
            Narration: `Advance Recovery - ${monthNames[month]} ${year}`
        });
    }

    // 9. Final balance check (safety net)
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of journalLines) {
        totalDebit += parseFloat(line.Debit) || 0;
        totalCredit += parseFloat(line.Credit) || 0;
    }
    totalDebit = roundToWhole(totalDebit);
    totalCredit = roundToWhole(totalCredit);

    if (totalDebit !== totalCredit) {
        throw new Error(`Journal imbalance: Debit Rs. ${totalDebit} ≠ Credit Rs. ${totalCredit}`);
    }

    // 10. Create ONE Journal Voucher
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const voucherNumber = getNextVoucherNumber(month, year);

    const voucher = await VoucherModal.create({
        VoucherType: "JV",
        VoucherNumber: voucherNumber,
        VoucherDate: dateStr,
        Ref: `PAY-${year}-${String(month).padStart(2, "0")}`,
        VoucharData: journalLines,
        TotalDebit: String(totalDebit),
        TotalCredit: String(totalCredit),
        Remarks: `Payroll Closing for ${monthNames[month]} ${year}. ${toClose.length} employee(s).`
    });

    // 9. Update all payroll records for this month
    for (const p of toClose) {
        await PayrollModal.findByIdAndUpdate(p._id, {
            status: "closed",
            closedAt: new Date(),
            closedBy: userId,
            journalVoucherId: voucher._id
        });
    }

    // 10. Create audit logs
    const auditEntries = toClose.map(p => ({
        payrollId: p._id,
        employeeId: p.employeeId,
        action: "closed",
        performedBy: userId,
        month, year,
        details: `Closed. JV: ${voucherNumber}`,
        ipAddress: ip
    }));
    await PayrollAuditLog.create(auditEntries);

    return {
        success: true,
        message: `Payroll closed. Journal Voucher ${voucherNumber} posted.`,
        voucherId: voucher._id,
        voucherNumber,
        totalDebit,
        totalCredit,
        recordsClosed: toClose.length,
        recordsSkipped: alreadyClosed.length
    };
}

// ─── Backward compat: close single record (delegates to month close) ──
export async function closePayroll(payrollId, userId, ip = "") {
    const payroll = await PayrollModal.findById(payrollId);
    if (!payroll) throw new Error("Payroll record not found");
    if (payroll.status !== "paid") {
        throw new Error(`Cannot close payroll in "${payroll.status}" status. Must be "paid".`);
    }
    if (payroll.journalVoucherId) {
        return { success: false, message: "Payroll already closed. Journal Voucher already posted." };
    }
    return closePayrollMonth(payroll.month, payroll.year, userId, ip);
}

export async function bulkClosePayroll(payrollIds, userId, ip = "", month = null, year = null) {
    // If month/year provided, close the entire period
    if (month && year) {
        const result = await closePayrollMonth(month, year, userId, ip);
        if (result.success) {
            return { closed: result.recordsClosed, skipped: result.recordsSkipped, failed: 0, errors: [] };
        }
        return { closed: 0, skipped: 1, failed: 0, errors: [] };
    }

    // Otherwise group by month/year from provided IDs
    if (payrollIds.length === 0) return { closed: 0, skipped: 0, failed: 0, errors: [] };

    const records = await PayrollModal.find({ _id: { $in: payrollIds } });
    const periods = {};
    for (const r of records) {
        const key = `${r.month}-${r.year}`;
        if (!periods[key]) periods[key] = { month: r.month, year: r.year };
    }

    const results = { closed: 0, skipped: 0, failed: 0, errors: [] };

    for (const period of Object.values(periods)) {
        try {
            const result = await closePayrollMonth(period.month, period.year, userId, ip);
            if (result.success) {
                results.closed += result.recordsClosed || 0;
                results.skipped += result.recordsSkipped || 0;
            } else {
                results.skipped++;
            }
        } catch (err) {
            results.failed++;
            results.errors.push({ period: `${period.month}/${period.year}`, error: err.message });
        }
    }

    return results;
}
