/**
 * Seed default Leave Types
 * Run: node scripts/seedLeaveTypes.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import LeaveTypeModal from '../modal/LeaveTypeModal.js';

const DEFAULT_LEAVE_TYPES = [
    { name: "Casual Leave", code: "CL", isPaid: true, color: "#3B82F6", description: "Short-term personal leave" },
    { name: "Sick Leave", code: "SL", isPaid: true, color: "#EF4444", description: "Leave due to illness" },
    { name: "Medical Leave", code: "ML", isPaid: true, color: "#F97316", description: "Extended medical leave" },
    { name: "Annual Leave", code: "AL", isPaid: true, color: "#10B981", description: "Yearly vacation leave" },
    { name: "Earned Leave", code: "EL", isPaid: true, color: "#8B5CF6", description: "Earned after service period" },
    { name: "Maternity Leave", code: "MTL", isPaid: true, color: "#EC4899", description: "Maternity leave for female employees", applicableTo: "female" },
    { name: "Paternity Leave", code: "PTL", isPaid: true, color: "#06B6D4", description: "Paternity leave for male employees", applicableTo: "male" },
    { name: "Unpaid Leave", code: "UL", isPaid: false, color: "#6B7280", description: "Leave without pay" },
    { name: "Half Day Leave", code: "HDL", isPaid: true, color: "#F59E0B", description: "Half day absence" },
    { name: "Study Leave", code: "STL", isPaid: true, color: "#7C3AED", description: "Leave for educational purposes" },
    { name: "Emergency Leave", code: "EML", isPaid: true, color: "#DC2626", description: "Urgent emergency situations" }
];

async function seed() {
    try {
        await mongoose.connect(process.env.URL);
        console.log('Connected to MongoDB');

        let created = 0;
        let skipped = 0;

        for (const lt of DEFAULT_LEAVE_TYPES) {
            const existing = await LeaveTypeModal.findOne({ $or: [{ code: lt.code }, { name: lt.name }] });
            if (existing) {
                skipped++;
                continue;
            }
            await LeaveTypeModal.create(lt);
            created++;
        }

        console.log(`\nSeed complete: ${created} created, ${skipped} skipped`);
        process.exit(0);
    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    }
}

seed();
