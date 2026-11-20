/**
 * ZKTeco Biometric Machine Client
 * 
 * Uses zklib package with TCP mode.
 * Supports: getUsers, getAttendance with date range filter.
 */

import zklib from 'zklib';

class ZKTecoClient {
    constructor(ip, port = 4370, timeout = 30000) {
        this.ip = ip;
        this.port = port;
        this.timeout = timeout;
        this.zk = null;
        this.connected = false;
    }

    // Connect to machine
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.zk = new zklib({
                    ip: this.ip,
                    port: this.port,
                    inport: 5200,
                    timeout: this.timeout,
                    connectionType: 'tcp',
                });

                this.zk.connect((err) => {
                    if (err) {
                        reject(new Error(`Connection failed: ${err.message || err}`));
                        return;
                    }
                    this.connected = true;
                    resolve(true);
                });

                setTimeout(() => {
                    if (!this.connected) reject(new Error('Connection timeout'));
                }, this.timeout + 2000);

            } catch (err) {
                reject(new Error(`Connection error: ${err.message}`));
            }
        });
    }

    // Fetch attendance with optional date range filter
    async getAttendance(options = {}) {
        if (!this.connected || !this.zk) {
            throw new Error('Not connected to machine');
        }

        const { startDate, endDate } = options;

        return new Promise((resolve, reject) => {
            const fetchTimeout = setTimeout(() => {
                reject(new Error('Attendance fetch timeout — machine has too much data'));
            }, this.timeout);

            try {
                this.zk.getAttendance((err, data) => {
                    clearTimeout(fetchTimeout);

                    if (err) {
                        reject(new Error(`Attendance error: ${err.message || err}`));
                        return;
                    }

                    const records = [];

                    if (Array.isArray(data)) {
                        for (const row of data) {
                            if (row && row.length >= 4) {
                                const punchUserId = String(row[0]).padStart(4, '0');
                                const dateTime = row[1];
                                const inOut = row[3];

                                // Parse date
                                let punchDate;
                                if (dateTime instanceof Date) {
                                    punchDate = dateTime;
                                } else {
                                    punchDate = new Date(dateTime);
                                }

                                if (isNaN(punchDate.getTime())) continue;

                                const punchDateStr = `${punchDate.getFullYear()}-${String(punchDate.getMonth() + 1).padStart(2, '0')}-${String(punchDate.getDate()).padStart(2, '0')}`;

                                // Filter by date range
                                if (startDate && punchDateStr < startDate) continue;
                                if (endDate && punchDateStr > endDate) continue;

                                const hh = String(punchDate.getHours()).padStart(2, '0');
                                const mm = String(punchDate.getMinutes()).padStart(2, '0');

                                records.push({
                                    employeeCode: punchUserId,
                                    punchTime: `${punchDateStr} ${hh}:${mm}:00`,
                                    punchType: inOut === 0 ? 'in' : 'out',
                                });
                            }
                        }
                    }

                    resolve(records);
                });
            } catch (err) {
                clearTimeout(fetchTimeout);
                reject(new Error(`Fetch error: ${err.message}`));
            }
        });
    }

    // Disconnect
    async disconnect() {
        if (this.zk) {
            try { this.zk.disconnect(); } catch (e) {}
            this.connected = false;
            this.zk = null;
        }
    }
}

export default ZKTecoClient;
