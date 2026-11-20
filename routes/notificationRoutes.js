import express from "express";

import {
    clearNotifications,
    deleteNotification,
    getNotifications,
    getPreferences,
    getUnreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
    setNotificationImportant,
    updatePreferences
} from "../controllers/notificationController.js";
import { auth } from "../middleware/authMiddleware.js";
import { notificationLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.use(auth, notificationLimiter);
router.get("/notifications", getNotifications);
router.get("/notifications/unread-count", getUnreadNotificationCount);
router.patch("/notifications/read-all", markAllNotificationsRead);
router.get("/notifications/preferences", getPreferences);
router.put("/notifications/preferences", updatePreferences);
router.patch("/notifications/:id/read", markNotificationRead);
router.patch("/notifications/:id/important", setNotificationImportant);
router.delete("/notifications", clearNotifications);
router.delete("/notifications/:id", deleteNotification);

export default router;
