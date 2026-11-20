import express from "express";
import { getNotifications, markAsRead, markAllAsRead, getUnreadCount } from "../Controllar/NotificationControllar.js";

const NotificationRouter = express.Router();

NotificationRouter.get("/", getNotifications);
NotificationRouter.get("/unread/:userId", getUnreadCount);
NotificationRouter.put("/:id/read", markAsRead);
NotificationRouter.put("/read-all/:userId", markAllAsRead);

export default NotificationRouter;
