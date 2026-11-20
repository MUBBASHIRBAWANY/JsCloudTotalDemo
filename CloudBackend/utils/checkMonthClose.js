import jwt from "jsonwebtoken";
import userModel from "../modal/userModal.js";

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export const checkMonthClose = async (req, res, dateField) => {
    try {
        const dateValue = req.body[dateField];
        if (!dateValue) return false;

        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return false;

        const decoded = jwt.verify(token, "peral-Dynamic");
        const userId = decoded?.val?._id || decoded?.val?.id;
        if (!userId) return false;

        const user = await userModel.findById(userId);
        if (!user || !user.userCloseMonth || user.userCloseMonth.length === 0) return false;

        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return false;

        const monthName = monthNames[date.getMonth()];
        const year = date.getFullYear();
        const monthYear = `${monthName} ${year}`;

        for (const entry of user.userCloseMonth) {
            if (entry.months && entry.months.includes(monthYear)) {
                return res.status(400).json({
                    success: false,
                    message: `This month is closed: ${monthYear}. You cannot create or edit transactions in a closed month.`
                });
            }
        }

        return false;
    } catch (err) {
        console.error("checkMonthClose error:", err);
        return false;
    }
};
