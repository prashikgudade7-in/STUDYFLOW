import db from "../config/database.js";
import { now } from "../utils/authUtils.js";

export const NOTIFICATION_PREFERENCES = Object.freeze([
    "study_reminders",
    "daily_goals",
    "challenge_updates",
    "achievement_notifications",
    "system_announcements"
]);

const preferenceByType = Object.freeze({
    study_reminder: "study_reminders",
    daily_goal: "daily_goals",
    challenge: "challenge_updates",
    achievement: "achievement_notifications",
    system: "system_announcements"
});

export const NOTIFICATION_ACTION_URLS = Object.freeze([
    "/#home",
    "/#challenge",
    "/#leaderboard",
    "/#stats",
    "/#settings"
]);

export function createNotificationFromEvent({
    userId,
    eventKey,
    type,
    title,
    message,
    priority = "normal",
    actionUrl = null,
    createdAt = now()
}) {
    const preference = preferenceByType[type];

    if (
        !Number.isSafeInteger(Number(userId)) ||
        Number(userId) < 1 ||
        typeof eventKey !== "string" ||
        !eventKey.trim() ||
        eventKey.length > 160 ||
        !preference ||
        typeof title !== "string" ||
        !title.trim() ||
        title.length > 120 ||
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 500 ||
        !["low", "normal", "high"].includes(priority) ||
        (actionUrl !== null && !NOTIFICATION_ACTION_URLS.includes(actionUrl)) ||
        !Number.isSafeInteger(createdAt)
    ) {
        throw new TypeError("Invalid notification event.");
    }

    db.prepare(`
        INSERT OR IGNORE INTO notification_preferences(
            user_id, study_reminders, daily_goals, challenge_updates,
            achievement_notifications, system_announcements
        )
        VALUES(?, 0, 0, 0, 0, 0)
    `).run(Number(userId));

    const enabled = db.prepare(`
        SELECT ${preference} AS enabled
        FROM notification_preferences
        WHERE user_id = ?
    `).get(Number(userId));

    if (!enabled?.enabled) {
        return null;
    }

    const inserted = db.prepare(`
        INSERT OR IGNORE INTO notifications(
            user_id, event_key, type, title, message, priority,
            action_url, created_at
        )
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        Number(userId),
        eventKey.trim(),
        type,
        title.trim(),
        message.trim(),
        priority,
        actionUrl,
        createdAt
    );

    return inserted.changes === 1 ? Number(inserted.lastInsertRowid) : null;
}

export function getNotificationPreferences(userId) {
    db.prepare(`
        INSERT OR IGNORE INTO notification_preferences(
            user_id, study_reminders, daily_goals, challenge_updates,
            achievement_notifications, system_announcements
        )
        VALUES(?, 0, 0, 0, 0, 0)
    `).run(userId);

    const preferences = db.prepare(`
        SELECT study_reminders, daily_goals, challenge_updates,
               achievement_notifications, system_announcements
        FROM notification_preferences
        WHERE user_id = ?
    `).get(userId);

    return Object.fromEntries(
        NOTIFICATION_PREFERENCES.map(key => [key, Boolean(preferences[key])])
    );
}
