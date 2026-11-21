import AttendanceMonthLockModal from "../Modal/AttendanceMonthLockModal.js";
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


export const lockMonth = async (req, res) => {
    try {
        const { month, year, reason } = req.body;
        if (!month || !year) {
            return hrmsFail(res, 400, "Missing fields", "Month and year are required.");
        }

        const lock = await AttendanceMonthLockModal.findOneAndUpdate(
            { month: parseInt(month), year: parseInt(year) },
            {
                locked: true,
                lockedBy: req.user?._id,
                lockedAt: new Date(),
                reason: reason || ""
            },
            { new: true, upsert: true }
        );

        res.status(200).send({ status: true, data: lock });
    } catch (err) {
        return hrmsCatch(res, err, "Month update failed", "The month could not be updated. Please try again.");
    }
};

export const unlockMonth = async (req, res) => {
    try {
        const { month, year, reason } = req.body;
        if (!month || !year) {
            return hrmsFail(res, 400, "Missing fields", "Month and year are required.");
        }

        const lock = await AttendanceMonthLockModal.findOneAndUpdate(
            { month: parseInt(month), year: parseInt(year) },
            {
                locked: false,
                unlockedBy: req.user?._id,
                unlockedAt: new Date(),
                reason: reason || ""
            },
            { new: true }
        );

        if (!lock) {
            return hrmsFail(res, 404, "Attendance lock not found", "No attendance lock was found for this month.");
        }

        res.status(200).send({ status: true, data: lock });
    } catch (err) {
        return hrmsCatch(res, err, "Month update failed", "The month could not be updated. Please try again.");
    }
};

export const getMonthLockStatus = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return hrmsFail(res, 400, "Missing fields", "Month and year are required.");
        }

        const lock = await AttendanceMonthLockModal.findOne({
            month: parseInt(month),
            year: parseInt(year)
        });

        res.status(200).send({ status: true, data: lock || { locked: false } });
    } catch (err) {
        return hrmsCatch(res, err, "Month lock status load failed", "The month lock status could not be loaded. Please try again.");
    }
};

export const isMonthLocked = async (month, year) => {
    const lock = await AttendanceMonthLockModal.findOne({ month, year });
    return lock && lock.locked;
};
