/**
 * PunchToAttendance — converts raw biometric punch records into daily attendance.
 *
 * ZKTeco machines export individual punch events:
 *   { employeeCode, punchTime, punchType: "in" | "out" }
 *
 * This engine groups punches by employee + date and produces one attendance
 * record per working day with checkIn / checkOut / status / overtime.
 */

function parseTime(timeStr) {
    if (!timeStr) return null;
    const [h, m] = String(timeStr).split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

function minutesToTime(minutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, "0");
    const m = String(minutes % 60).padStart(2, "0");
    return `${h}:${m}`;
}

// Convert Date to "YYYY-MM-DD" in local timezone
function toLocalDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * Convert raw punch records into daily attendance records.
 *
 * @param {Array} punches - [{ employeeCode, punchTime, punchType: "in"|"out" }]
 * @param {Object} policy - { shiftStart, shiftEnd, gracePeriodMinutes, overtimeMultiplier }
 * @returns {Array} - [{ employeeCode, date, checkIn, checkOut, status, overtime }]
 */
export function convertPunchesToAttendance(punches, policy = {}) {
    const shiftStart = parseTime(policy.shiftStart || "09:00");
    const shiftEnd = parseTime(policy.shiftEnd || "17:00");
    const graceMinutes = policy.gracePeriodMinutes ?? 15;

    // Group by employeeCode + date
    const groups = {};
    for (const punch of punches) {
        const { employeeCode, punchTime, punchType } = punch;
        if (!employeeCode || !punchTime) continue;

        const dt = new Date(punchTime);
        if (isNaN(dt.getTime())) continue;

        const date = toLocalDateStr(dt);
        const key = `${employeeCode}__${date}`;

        if (!groups[key]) {
            groups[key] = { employeeCode, date, ins: [], outs: [] };
        }

        const timeMinutes = dt.getHours() * 60 + dt.getMinutes();
        const normalizedType = String(punchType || "").toLowerCase().trim();

        // Explicit in/out from punch type
        if (normalizedType === "in" || normalizedType === "i" || normalizedType === "1") {
            groups[key].ins.push(timeMinutes);
        } else if (normalizedType === "out" || normalizedType === "o" || normalizedType === "0") {
            groups[key].outs.push(timeMinutes);
        } else {
            // No punch type specified — treat ALL punches as check-in candidates
            // The earliest punch of the day becomes checkIn, latest becomes checkOut
            groups[key].ins.push(timeMinutes);
        }
    }

    // Build daily attendance records
    const results = [];
    for (const key of Object.keys(groups)) {
        const g = groups[key];
        const ins = g.ins.sort((a, b) => a - b);
        const outs = g.outs.sort((a, b) => a - b);

        let earliestIn = ins.length > 0 ? ins[0] : null;
        let latestOut = outs.length > 0 ? outs[outs.length - 1] : null;

        // If no explicit out punches, use the latest "in" punch as checkout
        // (common when CSV has no punch type column — all punches go to ins[])
        if (latestOut === null && ins.length > 1) {
            latestOut = ins[ins.length - 1];
            earliestIn = ins[0];
        }

        const checkIn = earliestIn !== null ? minutesToTime(earliestIn) : "";
        const checkOut = latestOut !== null ? minutesToTime(latestOut) : "";

        // Determine status
        let status = "present";
        if (earliestIn !== null && shiftStart !== null) {
            if (earliestIn > shiftStart + graceMinutes) {
                status = "late";
            }
        }
        if (!checkIn && !checkOut) {
            status = "absent";
        }

        // Calculate overtime
        let overtime = 0;
        if (latestOut !== null && shiftEnd !== null) {
            const overtimeMinutes = latestOut - shiftEnd;
            if (overtimeMinutes > 0) {
                overtime = Math.round((overtimeMinutes / 60) * 100) / 100;
            }
        }

        results.push({
            employeeCode: g.employeeCode,
            date: g.date,
            checkIn,
            checkOut,
            status,
            overtime,
            punchCount: ins.length + outs.length,
        });
    }

    // Sort by employeeCode then date
    results.sort((a, b) => {
        if (a.employeeCode !== b.employeeCode) return a.employeeCode.localeCompare(b.employeeCode);
        return a.date.localeCompare(b.date);
    });

    return results;
}
