import NotificationModal from "../modal/NotificationModal.js";
import { hrmsCatch } from "../utils/hrmsError.js";


/**
 * Create a notification. Can be called from any module.
 */
export async function createNotification(userId, module, referenceType, referenceId, title, message, link = "", priority = "medium") {
    try {
        return await NotificationModal.create({
            userId,
            module,
            referenceType,
            referenceId,
            title,
            message,
            link,
            priority
        });
    } catch (err) {
        console.log("Notification create error:", err.message);
        return null;
    }
}

export const getNotifications = async (req, res) => {
    try {
        const { userId, module, isRead, page = 1, limit = 20 } = req.query;
        const query = {};
        if (userId) query.userId = userId;
        if (module) query.module = module;
        if (isRead !== undefined) query.isRead = isRead === "true";

        const data = await NotificationModal.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await NotificationModal.countDocuments(query);

        res.status(200).send({ status: true, data, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        return hrmsCatch(res, err, "Notifications load failed", "The notifications could not be loaded. Please try again.");
    }
};

export const markAsRead = async (req, res) => {
    try {
        const data = await NotificationModal.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() }, { new: true });
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "As read update failed", "The as read could not be updated. Please try again.");
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.params;
        await NotificationModal.updateMany({ userId, isRead: false }, { isRead: true, readAt: new Date() });
        res.status(200).send({ status: true, message: "All marked as read" });
    } catch (err) {
        return hrmsCatch(res, err, "Notification update failed", "Notifications could not be marked as read. Please try again.");
    }
};

export const getUnreadCount = async (req, res) => {
    try {
        const { userId } = req.params;
        const count = await NotificationModal.countDocuments({ userId, isRead: false });
        res.status(200).send({ status: true, data: { count } });
    } catch (err) {
        return hrmsCatch(res, err, "Unread count load failed", "The unread count could not be loaded. Please try again.");
    }
};
