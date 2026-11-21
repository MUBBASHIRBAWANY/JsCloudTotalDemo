import HolidayCalendarModal from "../Modal/HolidayCalendarModal.js"
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


// Parse date without timezone shift
function parseDateStr(dateStr) {
    if (!dateStr) return new Date();
    const s = String(dateStr).trim();
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
    return new Date(dateStr);
}

function toLocalDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// export const CreateHoliday = async (req, res) => {
//     try {
//         const { date, startDate, endDate, name, province, applicableReligion, isOptional } = req.body

//         // Date range support: create holiday for each day in range
//         const start = parseDateStr(startDate || date);
//         const end = parseDateStr(endDate || startDate || date);

//         if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//             return hrmsFail(res, 400, "Invalid value", "One or more dates are not valid.");
//         }

//         const holidays = [];
//         const current = new Date(start);
//         while (current <= end) {
//             const dateStr = toLocalDateStr(current);
//             const year = current.getFullYear();
//             holidays.push({ date: new Date(current), name, province, applicableReligion, isOptional: isOptional || false, year });
//             current.setDate(current.getDate() + 1);
//         }



//         return

//         const data = await HolidayCalendarModal.insertMany(holidays);
//         res.status(200).send({ status: true, data, count: data.length })
//     } catch (err) {
//         return hrmsCatch(res, err, "Holiday save failed", "The holiday could not be saved. Please try again.");
//     }
// }

export const CreateHoliday = async (req, res) => {
    try {
        const { startDate, endDate, name, province, applicableReligion, isOptional } = req.body;

        // 1. startDate / endDate empty, null ya undefined na hon
        if (!startDate || !endDate || !String(startDate).trim() || !String(endDate).trim()) {
            return hrmsFail(res, 400, "Missing value", "Start date and end date are required.");
        }

        const start = parseDateStr(startDate);
        const end = parseDateStr(endDate);

        // 2. Dono valid dates hon
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return hrmsFail(res, 400, "Invalid value", "One or more dates are not valid.");
        }

        // 3. startDate hamesha endDate se chhoti (ya barabar) ho
        if (start > end) {
            return hrmsFail(res, 400, "Invalid range", "Start date must be earlier than end date.");
        }

        // 4. Single entry, date key mein "start-end"
        const dateKey = `${toLocalDateStr(start)}_${toLocalDateStr(end)}`;

        const data = await HolidayCalendarModal.create({
            date: dateKey,
            name,
            province,
            applicableReligion,
            isOptional: isOptional || false,
            year: start.getFullYear(),
        });

        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Holiday save failed", "The holiday could not be saved. Please try again.");
    }
};

export const getAllHolidays = async (req, res) => {
    try {
        const { year, province } = req.query
        const query = {}
        if (year) query.year = Number(year)
        if (province) {
            query.$or = [
                { province: province },
                { province: "All" }
            ]
        }
        const data = await HolidayCalendarModal.find(query).sort({ date: 1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Holidays list failed", "Holidays could not be loaded. Please try again.");
    }
}

export const getHolidaysByProvinceAndReligion = async (req, res) => {
    try {
        const { province, religion, startDate, endDate } = req.query
        const query = {}

        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) }
        }

        if (province && religion) {
            query.$or = [
                { province: province, applicableReligion: religion },
                { province: province, applicableReligion: "All" },
                { province: "All", applicableReligion: religion },
                { province: "All", applicableReligion: "All" }
            ]
        } else if (province) {
            query.$or = [
                { province: province },
                { province: "All" }
            ]
        } else if (religion) {
            query.$or = [
                { applicableReligion: religion },
                { applicableReligion: "All" }
            ]
        }

        const data = await HolidayCalendarModal.find(query).sort({ date: 1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Holidays by province and religion load failed", "The holidays by province and religion could not be loaded. Please try again.");
    }
}

export const updateHoliday = async (req, res) => {
    try {
        const updateData = { ...req.body }
        if (updateData.date) {
            updateData.year = parseDateStr(updateData.date).getFullYear()
        }
        const data = await HolidayCalendarModal.findByIdAndUpdate(req.params.id, updateData, { new: true })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Holiday update failed", "The holiday could not be updated. Please try again.");
    }
}

export const deleteHoliday = async (req, res) => {
    try {
        await HolidayCalendarModal.findByIdAndDelete(req.params.id)
        res.status(200).send({ status: true, message: "Holiday deleted" })
    } catch (err) {
        return hrmsCatch(res, err, "Holiday delete failed", "The holiday could not be deleted. Please try again.");
    }
}

// ─── Bulk Import ─────────────────────────────────────────────────────────────

/**
 * POST /HolidayCalendar/bulk-import
 * Body: { holidays: [{ date, name, province, applicableReligion, isOptional }] }
 */
export const bulkImportHolidays = async (req, res) => {
    try {
        const { holidays } = req.body;
        if (!Array.isArray(holidays) || holidays.length === 0) {
            return hrmsFail(res, 400, "Invalid request", "Add at least one holiday.");
        }

        const errors = [];
        let imported = 0;
        let skipped = 0;

        for (let i = 0; i < holidays.length; i++) {
            const h = holidays[i];
            if (!h.date || !h.name) {
                errors.push({ row: i, reason: "missing date or name" });
                continue;
            }

            const dateObj = parseDateStr(h.date);
            if (isNaN(dateObj.getTime())) {
                errors.push({ row: i, name: h.name, reason: "invalid date" });
                continue;
            }

            const year = dateObj.getFullYear();
            const province = h.province || "All";
            const religion = h.applicableReligion || "All";

            // Check for duplicate (same date + province + religion)
            const existing = await HolidayCalendarModal.findOne({
                date: dateObj, province, applicableReligion: religion
            }).lean();

            if (existing) {
                skipped++;
                continue;
            }

            await HolidayCalendarModal.create({
                date: dateObj,
                name: h.name,
                province,
                applicableReligion: religion,
                isOptional: h.isOptional || false,
                year,
            });
            imported++;
        }

        return res.status(200).send({ status: true, imported, skipped, errors });
    } catch (err) {
        console.log("bulkImportHolidays error:", err);
        return hrmsCatch(res, err, "Import holidays upload failed", "The import holidays could not be uploaded. Please try again.");
    }
};

// ─── Pakistan Holiday Templates ─────────────────────────────────────────────

/**
 * Pre-loaded Pakistan public holidays by year.
 * Eid dates are approximate — HR should adjust after moon sighting.
 */
function getPakistanHolidayTemplate(year) {
    return [
        { date: `${year}-02-05`, name: "Kashmir Day", province: "All", applicableReligion: "All" },
        { date: `${year}-03-23`, name: "Pakistan Day", province: "All", applicableReligion: "All" },
        { date: `${year}-05-01`, name: "Labour Day", province: "All", applicableReligion: "All" },
        { date: `${year}-08-14`, name: "Independence Day", province: "All", applicableReligion: "All" },
        { date: `${year}-09-06`, name: "Defence Day", province: "All", applicableReligion: "All" },
        { date: `${year}-11-09`, name: "Iqbal Day", province: "All", applicableReligion: "All" },
        { date: `${year}-12-25`, name: "Quaid-e-Azam Day", province: "All", applicableReligion: "All" },
    ];
}

/**
 * POST /HolidayCalendar/load-template
 * Body: { year, province }
 * Pre-loads Pakistan public holidays for the given year.
 */
export const loadHolidayTemplate = async (req, res) => {
    try {
        const year = parseInt(req.body.year, 10);
        const province = req.body.province || "All";

        if (!year || year < 2020 || year > 2030) {
            return hrmsFail(res, 400, "Invalid value", "Year must be between 2020 and 2030.");
        }

        const template = getPakistanHolidayTemplate(year);
        let imported = 0;
        let skipped = 0;
        const errors = [];

        for (const h of template) {
            const dateObj = parseDateStr(h.date);
            const existing = await HolidayCalendarModal.findOne({
                date: dateObj, province: h.province, applicableReligion: h.applicableReligion
            }).lean();

            if (existing) {
                skipped++;
                continue;
            }

            await HolidayCalendarModal.create({
                date: dateObj,
                name: h.name,
                province: h.province,
                applicableReligion: h.applicableReligion,
                isOptional: h.isOptional || false,
                year,
            });
            imported++;
        }

        return res.status(200).send({
            status: true,
            message: `Template loaded for ${year}`,
            imported,
            skipped,
            total: template.length,
        });
    } catch (err) {
        console.log("loadHolidayTemplate error:", err);
        return hrmsCatch(res, err, "Load holiday template failed", "The load holiday template could not be completed. Please try again.");
    }
};
