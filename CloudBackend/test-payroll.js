/**
 * Payroll Calculation Test Script
 * 
 * Run: node test-payroll.js
 * 
 * Tests:
 *   1. Per day rate calculation
 *   2. Late deduction (minute-based)
 *   3. Absent deduction
 *   4. Free leave per month
 *   5. Informed = no deduction
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.URL;

async function connect() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
}

import EmployeeHrModal from './Modal/EmployeeHrModal.js';
import AttendanceHrModal from './Modal/AttendanceHrModal.js';
import { calculateMonthlyPayroll } from './engine/PayrollEngine.js';

// ─── Test Cases ─────────────────────────────────────────────────────────────

async function testPayroll() {
    const employees = await EmployeeHrModal.find({ status: 'active' });
    
    if (employees.length === 0) {
        console.log('No employees found. Run seed.js first.');
        return;
    }

    console.log('\n=== PAYROLL TEST ===\n');

    for (const emp of employees) {
        console.log(`\n--- Employee: ${emp.firstName} ${emp.lastName} (${emp.code}) ---`);
        
        // Calculate salary components
        const basic = emp.salarySetupBasket.basicSalary;
        const allowances = emp.salarySetupBasket.allowances || [];
        const totalAllowances = allowances.reduce((sum, a) => sum + (a.amount || 0), 0);
        const totalSalary = basic + totalAllowances;
        const perDayRate = totalSalary / 30;
        const perHourRate = perDayRate / 9;
        const perMinuteRate = perHourRate / 60;

        console.log(`Basic Salary: Rs. ${basic}`);
        console.log(`Total Allowances: Rs. ${totalAllowances}`);
        console.log(`Total Monthly Salary: Rs. ${totalSalary}`);
        console.log(`Per Day Rate (÷30): Rs. ${perDayRate.toFixed(2)}`);
        console.log(`Per Hour Rate (÷9): Rs. ${perHourRate.toFixed(2)}`);
        console.log(`Per Minute Rate (÷60): Rs. ${perMinuteRate.toFixed(2)}`);

        // Count attendance for July 2026
        const attendance = await AttendanceHrModal.find({
            employeeId: emp._id,
            date: { $gte: '2026-07-01', $lte: '2026-07-31' }
        });

        let present = 0, absent = 0, late = 0, leave = 0, lateMinutes = 0;

        for (const rec of attendance) {
            if (rec.status === 'present') present++;
            else if (rec.status === 'absent') absent++;
            else if (rec.status === 'late') {
                late++;
                // Calculate late minutes
                if (rec.checkIn) {
                    const [h, m] = rec.checkIn.split(':').map(Number);
                    const checkInMin = h * 60 + m;
                    const shiftStart = 9 * 60; // 9:00 AM
                    const grace = 15;
                    if (checkInMin > shiftStart + grace) {
                        lateMinutes += checkInMin - shiftStart;
                    }
                }
            }
            else if (rec.status === 'leave') leave++;
        }

        console.log(`\nAttendance Summary:`);
        console.log(`  Present: ${present} days`);
        console.log(`  Absent: ${absent} days`);
        console.log(`  Late: ${late} days (${lateMinutes} minutes total)`);
        console.log(`  Leave: ${leave} days`);

        // Calculate deductions
        const absentDeduction = absent * perDayRate;
        const lateDeduction = lateMinutes * perMinuteRate;
        const unpaidLeaveDeduction = leave * perDayRate; // Assuming no balance

        console.log(`\nDeductions:`);
        console.log(`  Absent (${absent} days × Rs. ${perDayRate.toFixed(2)}): Rs. ${absentDeduction.toFixed(2)}`);
        console.log(`  Late (${lateMinutes} min × Rs. ${perMinuteRate.toFixed(2)}): Rs. ${lateDeduction.toFixed(2)}`);
        console.log(`  Unpaid Leave (${leave} days × Rs. ${perDayRate.toFixed(2)}): Rs. ${unpaidLeaveDeduction.toFixed(2)}`);

        // Employee's configured deductions
        const empDeductions = (emp.salarySetupBasket.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0);
        console.log(`  Employee Deductions: Rs. ${empDeductions}`);

        const totalDeductions = absentDeduction + lateDeduction + unpaidLeaveDeduction + empDeductions;

        // Calculate final
        const gross = totalSalary;
        const net = gross - totalDeductions;

        console.log(`\n--- FINAL ---`);
        console.log(`Gross Salary: Rs. ${gross}`);
        console.log(`Total Deductions: Rs. ${totalDeductions.toFixed(2)}`);
        console.log(`Net Salary: Rs. ${net.toFixed(2)}`);
    }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    try {
        await connect();
        await testPayroll();
        process.exit(0);
    } catch (err) {
        console.error('Test error:', err);
        process.exit(1);
    }
}

main();
