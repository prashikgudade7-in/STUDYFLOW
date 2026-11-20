import db from "../config/database.js";
import {
    getNotificationPreferences,
    NOTIFICATION_PREFERENCES
} from "../services/notificationService.js";
import { now } from "../utils/authUtils.js";

const NOTIFICATION_FILTERS = Object.freeze({
    all: "",
    unread: "AND is_read = 0",
    important: "AND is_important = 1",
    system: "AND type = 'system'",
    study_reminders: "AND type = 'study_reminder'",
    challenges: "AND type = 'challenge'"
});
const NOTIFICATION_PAGE_SIZE = 50;

function unreadCount(userId) {
    return db.prepare(`
        SELECT COUNT(*) AS count
        FROM notifications
        WHERE user_id = ? AND is_read = 0
    `).get(userId).count;
}

function validNotificationId(id) {
    return typeof id === "string" &&
        /^[1-9]\d{0,14}$/.test(id) &&
        Number.isSafeInteger(Number(id));
}

function hasUnexpectedBody(req) {
    return req.body !== undefined && (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body) ||
        Object.keys(req.body).length > 0
    );
}

export function getNotifications(req, res) {
    const filter = req.query.filter === undefined ? "all" : req.query.filter;
    const pageValue = req.query.page === undefined ? "0" : req.query.page;
    const page = typeof pageValue === "string" && /^\d{1,5}$/.test(pageValue)
        ? Number(pageValue)
        : -1;

    if (
        typeof filter !== "string" ||
        !Object.hasOwn(NOTIFICATION_FILTERS, filter) ||
        !Number.isSafeInteger(page) ||
        page < 0 ||
        page > 10000
    ) {
        return res.status(400).json({ error: "Invalid notification filter." });
    }

    const rows = db.prepare(`
        SELECT id, type, title, message, priority, is_read, is_important,
               action_url, created_at
        FROM notifications
        WHERE user_id = ? ${NOTIFICATION_FILTERS[filter]}
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?
    `).all(req.user.id, NOTIFICATION_PAGE_SIZE + 1, page * NOTIFICATION_PAGE_SIZE);
    const hasMore = rows.length > NOTIFICATION_PAGE_SIZE;
    const notifications = rows.slice(0, NOTIFICATION_PAGE_SIZE).map(notification => ({
        ...notification,
        is_read: Boolean(notification.is_read),
        is_important: Boolean(notification.is_important)
    }));

    res.set("Cache-Control", "no-store");
    return res.json({
        notifications,
        unread_count: unreadCount(req.user.id),
        has_more: hasMore,
        next_page: hasMore ? page + 1 : null
    });
}

export function getUnreadNotificationCount(req, res) {
    res.set("Cache-Control", "no-store");
    return res.json({ unread_count: unreadCount(req.user.id) });
}

export function markNotificationRead(req, res) {
    if (!validNotificationId(req.params.id) || hasUnexpectedBody(req)) {
        return res.status(400).json({ error: "Invalid notification ID." });
    }

    const notificationId = Number(req.params.id);
    const owned = db.prepare(`
        SELECT 1
        FROM notifications
        WHERE id = ? AND user_id = ?
    `).get(notificationId, req.user.id);

    if (!owned) {
        return res.status(404).json({ error: "Notification not found." });
    }

    db.prepare(`
        UPDATE notifications
        SET is_read = 1
        WHERE id = ? AND user_id = ?
    `).run(notificationId, req.user.id);

    return res.json({
        ok: true,
        unread_count: unreadCount(req.user.id)
    });
}

export function markAllNotificationsRead(req, res) {
    if (hasUnexpectedBody(req)) {
        return res.status(400).json({ error: "Invalid notification request." });
    }

    db.prepare(`
        UPDATE notifications
        SET is_read = 1
        WHERE user_id = ? AND is_read = 0
    `).run(req.user.id);

    return res.json({ ok: true, unread_count: 0 });
}

export function deleteNotification(req, res) {
    if (!validNotificationId(req.params.id) || hasUnexpectedBody(req)) {
        return res.status(400).json({ error: "Invalid notification ID." });
    }

    const deleted = db.prepare(`
        DELETE FROM notifications
        WHERE id = ? AND user_id = ?
    `).run(Number(req.params.id), req.user.id);

    if (deleted.changes !== 1) {
        return res.status(404).json({ error: "Notification not found." });
    }

    return res.json({
        ok: true,
        unread_count: unreadCount(req.user.id)
    });
}

export function clearNotifications(req, res) {
    if (hasUnexpectedBody(req)) {
        return res.status(400).json({ error: "Invalid notification request." });
    }

    const deleted = db.prepare(`
        DELETE FROM notifications
        WHERE user_id = ?
    `).run(req.user.id);

    return res.json({ ok: true, deleted: deleted.changes, unread_count: 0 });
}

export function setNotificationImportant(req, res) {
    if (
        !validNotificationId(req.params.id) ||
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body) ||
        Object.keys(req.body).length !== 1 ||
        typeof req.body.is_important !== "boolean"
    ) {
        return res.status(400).json({ error: "Invalid important status." });
    }

    const updated = db.prepare(`
        UPDATE notifications
        SET is_important = ?
        WHERE id = ? AND user_id = ?
    `).run(Number(req.body.is_important), Number(req.params.id), req.user.id);

    if (updated.changes !== 1) {
        return res.status(404).json({ error: "Notification not found." });
    }

    return res.json({
        ok: true,
        is_important: req.body.is_important,
        unread_count: unreadCount(req.user.id)
    });
}

export function getPreferences(req, res) {
    res.set("Cache-Control", "no-store");
    return res.json({
        preferences: getNotificationPreferences(req.user.id)
    });
}

export function updatePreferences(req, res) {
    const body = req.body;

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).length !== NOTIFICATION_PREFERENCES.length ||
        Object.keys(body).some(key => !NOTIFICATION_PREFERENCES.includes(key)) ||
        NOTIFICATION_PREFERENCES.some(key => typeof body[key] !== "boolean")
    ) {
        return res.status(400).json({ error: "Invalid notification preferences." });
    }

    const update = db.transaction(() => {
        db.prepare(`
            INSERT OR IGNORE INTO notification_preferences(
                user_id, study_reminders, daily_goals, challenge_updates,
                achievement_notifications, system_announcements
            )
            VALUES(?, 0, 0, 0, 0, 0)
        `).run(req.user.id);

        db.prepare(`
            UPDATE notification_preferences
            SET study_reminders = ?,
                daily_goals = ?,
                challenge_updates = ?,
                achievement_notifications = ?,
                system_announcements = ?,
                updated_at = ?
            WHERE user_id = ?
        `).run(
            Number(body.study_reminders),
            Number(body.daily_goals),
            Number(body.challenge_updates),
            Number(body.achievement_notifications),
            Number(body.system_announcements),
            now(),
            req.user.id
        );
    });

    update.immediate();

    return res.json({
        ok: true,
        preferences: getNotificationPreferences(req.user.id)
    });
}
