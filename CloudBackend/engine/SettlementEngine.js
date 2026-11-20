/**
 * SettlementEngine.js
 *
 * Pure computation module for Final Settlement calculations in the
 * Separation & Exit Management module (Requirement 7.6).
 *
 * No database calls are made here — callers are responsible for fetching
 * the required data and passing it in.
 */

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000; // 365.25 × 86400000

/**
 * Round a number to 2 decimal places.
 * @param {number} value
 * @returns {number}
 */
function roundTo2(value) {
    return Math.round(value * 100) / 100;
}

/**
 * Compute the final settlement for a departing employee.
 *
 * @param {Object} employee - HrEmployee document (or plain object)
 *   @param {Object}  employee.salarySetupBasket
 *   @param {number}  employee.salarySetupBasket.basicSalary
 *   @param {Date|string} employee.joiningDate
 *   @param {Object}  employee.leaveBucket
 *   @param {Object}  employee.leaveBucket.annual
 *   @param {number}  employee.leaveBucket.annual.balance  — unused annual leave days
 *
 * @param {Object} separationRequest - SeparationRequest document (or plain object)
 *   @param {Date|string} separationRequest.lastWorkingDate
 *   @param {Date|string} separationRequest.noticePeriodStartDate
 *     Used to derive days_worked_in_partial_month:
 *     the number of days worked from noticePeriodStartDate to lastWorkingDate (inclusive).
 *
 * @param {number[]} loanBalances - Array of remaining balances for all active loan accounts.
 *
 * @returns {{
 *   unpaidSalary:   number,
 *   encashableLeave: number,
 *   yearsOfService:  number,
 *   gratuity:        number,
 *   loanDeduction:   number,
 *   netSettlement:   number
 * }}
 */
export function computeSettlement(employee, separationRequest, loanBalances) {
    // ── 1. Extract and normalise inputs ──────────────────────────────────────

    const basicSalary = Number(employee?.salarySetupBasket?.basicSalary) || 0;
    const joiningDate = new Date(employee.joiningDate);
    const unusedAnnualDays = Number(employee?.leaveBucket?.annual?.balance) || 0;

    const lastWorkingDate = new Date(separationRequest.lastWorkingDate);
    const noticePeriodStartDate = new Date(separationRequest.noticePeriodStartDate);

    // ── 2. Unpaid salary ─────────────────────────────────────────────────────
    //
    // unpaid_salary = (days_worked_in_partial_month / total_days_in_month) × basicSalary
    //
    // days_worked_in_partial_month = lastWorkingDate day-of-month − noticePeriodStartDate day-of-month + 1
    // total_days_in_month          = calendar days in the month of lastWorkingDate

    let unpaidSalary = 0;

    if (basicSalary !== 0) {
        const daysWorkedInPartialMonth =
            lastWorkingDate.getDate() - noticePeriodStartDate.getDate() + 1;

        // Total days in the month of lastWorkingDate (year, month are 1-indexed after getMonth()+1)
        const totalDaysInMonth = new Date(
            lastWorkingDate.getFullYear(),
            lastWorkingDate.getMonth() + 1, // next month
            0                               // day 0 = last day of previous month
        ).getDate();

        const effectiveDays = Math.max(0, daysWorkedInPartialMonth);
        unpaidSalary = roundTo2((effectiveDays / totalDaysInMonth) * basicSalary);
    }

    // ── 3. Encashable leave ──────────────────────────────────────────────────
    //
    // encashable_leave = unused_annual_days × (basicSalary / 30)

    let encashableLeave = 0;
    if (basicSalary !== 0) {
        encashableLeave = roundTo2(unusedAnnualDays * (basicSalary / 30));
    }

    // ── 4. Years of service ──────────────────────────────────────────────────
    //
    // years_of_service = floor((lastWorkingDate − joiningDate) in ms / (365.25 × 86400000))

    const yearsOfService = Math.floor(
        (lastWorkingDate.getTime() - joiningDate.getTime()) / MS_PER_YEAR
    );

    // ── 5. Gratuity ──────────────────────────────────────────────────────────
    //
    // gratuity = (years_of_service >= 1) ? (basicSalary / 26) × 30 × years_of_service : 0

    let gratuity = 0;
    if (basicSalary !== 0 && yearsOfService >= 1) {
        gratuity = roundTo2((basicSalary / 26) * 30 * yearsOfService);
    }

    // ── 6. Loan deduction ────────────────────────────────────────────────────
    //
    // loan_deduction = sum of remainingBalance for all active LoanAccount records

    const loanDeduction = roundTo2(
        (Array.isArray(loanBalances) ? loanBalances : [])
            .reduce((sum, bal) => sum + (Number(bal) || 0), 0)
    );

    // ── 7. Net settlement ────────────────────────────────────────────────────
    //
    // net_settlement = unpaid_salary + encashable_leave + gratuity − loan_deduction

    const netSettlement = roundTo2(unpaidSalary + encashableLeave + gratuity - loanDeduction);

    return {
        unpaidSalary,
        encashableLeave,
        yearsOfService,
        gratuity,
        loanDeduction,
        netSettlement,
    };
}
