/**
 * Migrate attendance records: copy status → attendanceStatus, set workMode = "office"
 * Run: node scripts/migrateAttendanceStatus.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import AttendanceHrModal from '../modal/AttendanceHrModal.js';

const STATUS_MAP = {
    "present": "present",
    "late": "present",
    "absent": "absent",
    "leave": "leave",
    "holiday": "holiday",
    "half-day": "half_day"
};

async function migrate() {
    try {
        await mongoose.connect(process.env.URL);
        console.log('Connected to MongoDB');

        // Find records without attendanceStatus
        const records = await AttendanceHrModal.find({ attendanceStatus: { $exists: false } });
        console.log(`Found ${records.length} records to migrate`);

        let updated = 0;
        for (const rec of records) {
            const attendanceStatus = STATUS_MAP[rec.status] || "present";
            await AttendanceHrModal.findByIdAndUpdate(rec._id, {
                attendanceStatus,
                workMode: "office"
            });
            updated++;
        }

        console.log(`Migration complete: ${updated} records updated`);
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

migrate();
