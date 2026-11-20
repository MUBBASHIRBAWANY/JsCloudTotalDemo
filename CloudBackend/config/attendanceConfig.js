/**
 * Attendance Configuration
 * 
 * Central config for attendance processing.
 * Modify these values to change attendance behavior.
 */

export const ATTENDANCE_CONFIG = {
    // Default off-days (applied to all employees unless overridden)
    defaultOffDays: ['Sunday'],

    // Grace period in minutes (late within grace = no deduction)
    defaultGraceMinutes: 15,

    // Working hours per day (for per-hour/minute rate calculation)
    defaultWorkingHours: 9,

    // Auto-fill missing days on bulk upload
    autoFillAbsences: true,

    // Logging level: 'verbose' | 'normal' | 'silent'
    logLevel: 'verbose',

    // ZKTeco machine default settings
    zkteco: {
        defaultPort: 4370,
        timeout: 30000,
    }
};

/**
 * Attendance Logger — writes processing details to console + file
 */
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve('logs');

export class AttendanceLogger {
    constructor(processName) {
        this.processName = processName;
        this.startTime = new Date();
        this.logs = [];
        this.ensureLogDir();
    }

    ensureLogDir() {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
    }

    log(level, message, data = null) {
        const entry = {
            time: new Date().toISOString(),
            level,
            message,
            data,
        };
        this.logs.push(entry);

        if (ATTENDANCE_CONFIG.logLevel === 'silent') return;

        const prefix = `[${this.processName}]`;
        const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[32m';
        const reset = '\x1b[0m';

        console.log(`${color}${prefix} ${message}${reset}`);
        if (data && ATTENDANCE_CONFIG.logLevel === 'verbose') {
            console.log(`  → ${JSON.stringify(data, null, 2)}`);
        }
    }

    info(msg, data) { this.log('info', msg, data); }
    warn(msg, data) { this.log('warn', msg, data); }
    error(msg, data) { this.log('error', msg, data); }

    // Write full log to file
    writeToFile() {
        const duration = ((Date.now() - this.startTime.getTime()) / 1000).toFixed(2);
        const summary = {
            process: this.processName,
            startedAt: this.startTime.toISOString(),
            completedAt: new Date().toISOString(),
            durationSeconds: parseFloat(duration),
            totalEntries: this.logs.length,
            errors: this.logs.filter(l => l.level === 'error').length,
            warnings: this.logs.filter(l => l.level === 'warn').length,
        };

        const logContent = {
            summary,
            entries: this.logs,
        };

        const fileName = `${this.processName}-${Date.now()}.log`;
        const filePath = path.join(LOG_DIR, fileName);

        fs.writeFileSync(filePath, JSON.stringify(logContent, null, 2));
        return filePath;
    }
}
