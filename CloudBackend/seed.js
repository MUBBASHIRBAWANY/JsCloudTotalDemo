/**
 * HRMS Seed Script — Test Data Generator
 * 
 * Run: node seed.js
 * 
 * Creates:
 *   1. Company Policy
 *   2. Departments & Designations
 *   3. Allowance Types & Deduction Types
 *   4. Holiday Calendar (Pakistan 2026)
 *   5. Employees (3 sample employees)
 *   6. Attendance records (1 month)
 *   7. Leave applications
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.URL;

// ─── Connect ────────────────────────────────────────────────────────────────

async function connect() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
}

// ─── Import Models ──────────────────────────────────────────────────────────

import CompanyPolicyModal from './modal/CompanyPolicyModal.js';
import HolidayCalendarModal from './modal/HolidayCalendarModal.js';
import EmployeeHrModal from './modal/EmployeeHrModal.js';
import AttendanceHrModal from './modal/AttendanceHrModal.js';
import AllowanceTypeModal from './modal/AllowanceTypeModal.js';
import DeductionTypeModal from './modal/DeductionTypeModal.js';
import LeaveApplicationModal from './modal/LeaveApplicationModal.js';

// ─── 1. Company Policy ──────────────────────────────────────────────────────

async function createCompanyPolicy() {
    const existing = await CompanyPolicyModal.findOne();
    if (existing) {
        console.log('Company Policy already exists, skipping');
        return;
    }

    await CompanyPolicyModal.create({
        shiftStart: '09:00',
        shiftEnd: '18:00',
        gracePeriodMinutes: 15,
        workWeek: { offDays: ['Sunday'] },
        workingDaysPerWeek: 6,
        overtimeMultiplier: 1.5,
        holidayOvertimeMultiplier: 2.0,
        maxOvertimeHours: 4,
        payCalculationBasis: 'monthly_days',
        casualLeave: 12,
        medicalLeave: 10,
        annualLeave: 14,
        annualLeaveCarryForward: true,
        annualLeaveMaxCarry: 14,
        freeLeavePerMonth: 1,
        incomeTaxEnabled: false,
        eobiEmployeeShare: 0,
        socialSecurityRate: 0,
        companyName: 'Pearl Dynamic (Pvt.) Ltd.',
    });
    console.log('Company Policy created');
}

// ─── 2. Departments & Designations (simple objects) ─────────────────────────

async function createDepartments() {
    // Departments are stored as simple objects in the employee model
    // No separate collection needed for seed
    console.log('Departments: Use existing department setup');
}

// ─── 3. Allowance Types ─────────────────────────────────────────────────────

async function createAllowanceTypes() {
    const existing = await AllowanceTypeModal.countDocuments();
    if (existing > 0) {
        console.log('Allowance Types already exist, skipping');
        return;
    }

    const types = [
        { code: 'FUEL', name: 'Fuel Allowance', defaultAmount: 10000, type: 'fixed' },
        { code: 'TRANSPORT', name: 'Transport Allowance', defaultAmount: 5000, type: 'fixed' },
        { code: 'DEARNESS', name: 'Dearness Allowance', defaultAmount: 3000, type: 'fixed' },
        { code: 'SPECIAL', name: 'Special Allowance', defaultAmount: 0, type: 'fixed' },
        { code: 'HOUSE', name: 'House Rent Allowance', defaultAmount: 8000, type: 'fixed' },
        { code: 'MEDICAL', name: 'Medical Allowance', defaultAmount: 2000, type: 'fixed' },
    ];

    await AllowanceTypeModal.insertMany(types);
    console.log(`${types.length} Allowance Types created`);
}

// ─── 4. Deduction Types ─────────────────────────────────────────────────────

async function createDeductionTypes() {
    const existing = await DeductionTypeModal.countDocuments();
    if (existing > 0) {
        console.log('Deduction Types already exist, skipping');
        return;
    }

    const types = [
        { code: 'LOAN', name: 'Loan Repayment', defaultAmount: 0, type: 'fixed', mandatory: false },
        { code: 'ADVANCE', name: 'Advance Recovery', defaultAmount: 0, type: 'fixed', mandatory: false },
        { code: 'UNION', name: 'Union Fund', defaultAmount: 200, type: 'fixed', mandatory: true },
        { code: 'EOBI', name: 'EOBI', defaultAmount: 0, type: 'fixed', mandatory: true },
        { code: 'SS', name: 'Social Security', defaultAmount: 0, type: 'fixed', mandatory: true },
    ];

    await DeductionTypeModal.insertMany(types);
    console.log(`${types.length} Deduction Types created`);
}

// ─── 5. Holiday Calendar (Pakistan 2026) ────────────────────────────────────

async function createHolidays() {
    const existing = await HolidayCalendarModal.countDocuments({ year: 2026 });
    if (existing > 0) {
        console.log('2026 Holidays already exist, skipping');
        return;
    }

    const holidays = [
        { date: '2026-02-05', name: 'Kashmir Day', province: 'All', applicableReligion: 'All' },
        { date: '2026-03-23', name: 'Pakistan Day', province: 'All', applicableReligion: 'All' },
        { date: '2026-04-21', name: 'Eid ul Fitr', province: 'All', applicableReligion: 'Muslim' },
        { date: '2026-04-22', name: 'Eid ul Fitr Holiday', province: 'All', applicableReligion: 'Muslim' },
        { date: '2026-05-01', name: 'Labour Day', province: 'All', applicableReligion: 'All' },
        { date: '2026-06-28', name: 'Eid ul Adha', province: 'All', applicableReligion: 'Muslim' },
        { date: '2026-06-29', name: 'Eid ul Adha Holiday', province: 'All', applicableReligion: 'Muslim' },
        { date: '2026-06-30', name: 'Eid ul Adha Holiday', province: 'All', applicableReligion: 'Muslim' },
        { date: '2026-08-14', name: 'Independence Day', province: 'All', applicableReligion: 'All' },
        { date: '2026-09-06', name: 'Defence Day', province: 'All', applicableReligion: 'All' },
        { date: '2026-11-09', name: 'Iqbal Day', province: 'All', applicableReligion: 'All' },
        { date: '2026-12-25', name: 'Quaid-e-Azam Day', province: 'All', applicableReligion: 'All' },
        { date: '2026-12-25', name: 'Christmas', province: 'All', applicableReligion: 'Christian' },
    ];

    for (const h of holidays) {
        // Parse date without timezone shift
        const parts = h.date.split('-');
        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        await HolidayCalendarModal.create({
            ...h,
            date: dateObj,
            year: 2026,
        });
    }
    console.log(`${holidays.length} Holidays created for 2026`);
}

// ─── 6. Employees ───────────────────────────────────────────────────────────

async function createEmployees() {
    const existing = await EmployeeHrModal.countDocuments();
    // if (existing < 7) {
    //     console.log('Employees already exist, skipping');
    //     return;
    // }

    // First create a department and designation (if needed)
    // For seed, we'll use dummy ObjectIds
    const deptId = new mongoose.Types.ObjectId();
    const desigId = new mongoose.Types.ObjectId();

    const employees = [
        {
            code: '0007',
            firstName: 'Ahmed',
            lastName: 'Khan',
            email: 'ahmed@pearldynamic.com',
            phone: '0300-1234567',
            gender: 'male',
            departmentId: deptId,
            designationId: desigId,
            joiningDate: new Date('2023-01-15'),
            employmentType: 'permanent',
            status: 'active',
            storeId: 'store-001',
            isForDistributor: false,
            policyTags: { religion: 'Muslim', workWeek: { offDays: ['Sunday'] } },
            workingHours: 9,
            salarySetupBasket: {
                basicSalary: 40000,
                allowances: [
                    { code: 'FUEL', name: 'Fuel Allowance', amount: 10000 },
                    { code: 'TRANSPORT', name: 'Transport Allowance', amount: 5000 },
                ],
                deductions: [
                    { code: 'UNION', name: 'Union Fund', amount: 200 },
                ],
            },
            leaveBucket: {
                casual: { allocated: 12, used: 0, balance: 12 },
                medical: { allocated: 10, used: 0, balance: 10 },
                annual: { allocated: 14, used: 0, balance: 14 },
            },
        },
        {
            code: '0008',
            firstName: 'Sara',
            lastName: 'Ali',
            email: 'sara@pearldynamic.com',
            phone: '0301-2345678',
            gender: 'female',
            departmentId: deptId,
            designationId: desigId,
            joiningDate: new Date('2024-03-01'),
            employmentType: 'permanent',
            status: 'active',
            storeId: 'store-001',
            isForDistributor: false,
            policyTags: { religion: 'Muslim', workWeek: { offDays: ['Sunday'] } },
            workingHours: 9,
            salarySetupBasket: {
                basicSalary: 30000,
                allowances: [
                    { code: 'FUEL', name: 'Fuel Allowance', amount: 8000 },
                    { code: 'HOUSE', name: 'House Rent Allowance', amount: 6000 },
                ],
                deductions: [],
            },
            leaveBucket: {
                casual: { allocated: 12, used: 0, balance: 12 },
                medical: { allocated: 10, used: 0, balance: 10 },
                annual: { allocated: 14, used: 0, balance: 14 },
            },
        },
        {
            code: '0009',
            firstName: 'Usman',
            lastName: 'Shah',
            email: 'usman@pearldynamic.com',
            phone: '0302-3456789',
            gender: 'male',
            departmentId: deptId,
            designationId: desigId,
            joiningDate: new Date('2022-06-15'),
            employmentType: 'permanent',
            status: 'active',
            storeId: 'store-002',
            isForDistributor: true,
            policyTags: { religion: 'Muslim', workWeek: { offDays: ['Sunday'] } },
            workingHours: 9,
            salarySetupBasket: {
                basicSalary: 50000,
                allowances: [
                    { code: 'FUEL', name: 'Fuel Allowance', amount: 15000 },
                    { code: 'TRANSPORT', name: 'Transport Allowance', amount: 8000 },
                    { code: 'SPECIAL', name: 'Special Allowance', amount: 5000 },
                ],
                deductions: [
                    { code: 'UNION', name: 'Union Fund', amount: 300 },
                ],
            },
            leaveBucket: {
                casual: { allocated: 12, used: 0, balance: 12 },
                medical: { allocated: 10, used: 0, balance: 10 },
                annual: { allocated: 14, used: 0, balance: 14 },
            },
        },
    ];

    await EmployeeHrModal.insertMany(employees);
    console.log(`${employees.length} Employees created`);
}

// ─── 7. Attendance (July 2026 — 23 working days) ───────────────────────────

async function createAttendance() {
    const existing = await AttendanceHrModal.countDocuments();
    if (existing > 0) {
        console.log('Attendance records already exist, skipping');
        return;
    }

    const employees = await EmployeeHrModal.find({ status: 'active' });
    if (employees.length === 0) {
        console.log('No employees found, skipping attendance');
        return;
    }

    const year = 2026;
    const month = 7; // July
    const daysInMonth = 31;
    const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const offDays = ['Sunday'];

    // Fetch holidays for July 2026
    const holidays = await HolidayCalendarModal.find({
        date: { $gte: new Date(2026, 6, 1), $lte: new Date(2026, 6, 31) }
    }).lean();
    const holidayDates = new Set(holidays.map(h => {
        const d = new Date(h.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }));

    const toInsert = [];

    for (const emp of employees) {
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayOfWeek = WEEKDAY_NAMES[new Date(year, month - 1, d).getDay()];

            // Skip off-days
            if (offDays.includes(dayOfWeek)) continue;
            // Skip holidays
            if (holidayDates.has(dateStr)) continue;

            // Generate attendance
            const rand = Math.random();
            let status, checkIn, checkOut, informed = false;

            if (rand < 0.70) {
                // 70% present
                status = 'present';
                checkIn = '09:00';
                checkOut = '18:00';
            } else if (rand < 0.80) {
                // 10% late
                status = 'late';
                const lateMin = Math.floor(Math.random() * 30) + 16; // 16-45 min late
                checkIn = `09:${String(lateMin).padStart(2, '0')}`;
                checkOut = '18:00';
                informed = Math.random() < 0.3; // 30% chance informed
            } else if (rand < 0.90) {
                // 10% leave
                status = 'leave';
                checkIn = '';
                checkOut = '';
            } else {
                // 10% absent
                status = 'absent';
                checkIn = '';
                checkOut = '';
            }

            toInsert.push({
                employeeId: emp._id,
                date: dateStr,
                checkIn,
                checkOut,
                status,
                informed,
                overtime: 0,
                remarks: '',
            });
        }
    }

    if (toInsert.length > 0) {
        await AttendanceHrModal.insertMany(toInsert);
        console.log(`${toInsert.length} Attendance records created`);
    }
}

// ─── 8. Leave Applications ──────────────────────────────────────────────────

async function createLeaves() {
    const existing = await LeaveApplicationModal.countDocuments();
    if (existing > 0) {
        console.log('Leave applications already exist, skipping');
        return;
    }

    const employees = await EmployeeHrModal.find({ status: 'active' });
    if (employees.length === 0) return;

    const leaves = [
        {
            employeeId: employees[0]._id,
            leaveType: 'casual',
            startDate: new Date('2026-07-10'),
            endDate: new Date('2026-07-10'),
            daysRequested: 1,
            reason: 'Personal work',
            status: 'approved',
        },
        {
            employeeId: employees[1]._id,
            leaveType: 'medical',
            startDate: new Date('2026-07-15'),
            endDate: new Date('2026-07-16'),
            daysRequested: 2,
            reason: 'Doctor appointment',
            status: 'approved',
        },
        {
            employeeId: employees[2]._id,
            leaveType: 'casual',
            startDate: new Date('2026-07-20'),
            endDate: new Date('2026-07-20'),
            daysRequested: 1,
            reason: 'Family function',
            status: 'pending',
        },
    ];

    await LeaveApplicationModal.insertMany(leaves);
    console.log(`${leaves.length} Leave applications created`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    try {
        await connect();

        console.log('\n--- Creating Seed Data ---\n');

        await createCompanyPolicy();
        await createAllowanceTypes();
        await createDeductionTypes();
        await createHolidays();
        await createEmployees();
        await createAttendance();
        await createLeaves();

        console.log('\n--- Seed Complete ---\n');

        // Show summary
        const empCount = await EmployeeHrModal.countDocuments();
        const attCount = await AttendanceHrModal.countDocuments();
        const holidayCount = await HolidayCalendarModal.countDocuments({ year: 2026 });

        console.log(`Employees: ${empCount}`);
        console.log(`Attendance Records: ${attCount}`);
        console.log(`Holidays (2026): ${holidayCount}`);

        process.exit(0);
    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    }
}

main();
