import crypto from "node:crypto";
import db from "../config/database.js";
import { now, passwordHash } from "../utils/authUtils.js";

const MAX_RECORD_SIZE = 1024 * 1024;
const RECORD_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

// GET: Load all records belonging to the logged-in user
export function getData(req, res) {
    const rows = db.prepare(`
        SELECT id, kind, data, created_at, updated_at
        FROM records
        WHERE user_id=?
        ORDER BY updated_at DESC
    `).all(req.user.id);

    res.json({
        records: rows.map(r => ({
            ...r,
            data: JSON.parse(r.data)
        }))
    });
}

// POST: Save or update a record
export function saveData(req, res) {
    const {
        kind,
        data = {}
    } = req.body || {};

    const id = req.body?.id === undefined
        ? crypto.randomBytes(12).toString("base64url")
        : req.body.id;

    const allowedKinds = [
        "task",
        "timetable",
        "event",
        "session",
        "goal",
        "saved_word",
        "achievement"
    ];

    if (
        !allowedKinds.includes(kind) ||
        typeof id !== "string" ||
        !RECORD_ID_PATTERN.test(id) ||
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {
        return res.status(400).json({
            error: "Invalid record."
        });
    }

    const serializedData = JSON.stringify(data);

    if (Buffer.byteLength(serializedData, "utf8") > MAX_RECORD_SIZE) {
        return res.status(413).json({
            error: "Record data exceeds the 1 MB limit."
        });
    }

    const timestamp = now();

    const existing = db.prepare(`
        SELECT id FROM records
        WHERE id=? AND user_id=?
    `).get(id, req.user.id);

    if (existing) {
        db.prepare(`
            UPDATE records
            SET kind=?, data=?, updated_at=?
            WHERE id=? AND user_id=?
        `).run(
            kind,
            serializedData,
            timestamp,
            id,
            req.user.id
        );
    } else {
        db.prepare(`
            INSERT INTO records(
                id, user_id, kind, data, created_at, updated_at
            )
            VALUES(?,?,?,?,?,?)
        `).run(
            id,
            req.user.id,
            kind,
            serializedData,
            timestamp,
            timestamp
        );
    }

    res.json({
        id,
        kind,
        data,
        updated_at: timestamp
    });
}

// DELETE: Delete a specific record
export function deleteData(req, res) {
    if (req.query.id === undefined) {
        if (
            !req.body ||
            typeof req.body !== "object" ||
            Array.isArray(req.body) ||
            Object.keys(req.body).length !== 1 ||
            req.body.confirm !== true
        ) {
            return res.status(400).json({
                error: "Explicit confirmation is required to delete all study records."
            });
        }

        const deleted = db.prepare(`
            DELETE FROM records
            WHERE user_id = ?
        `).run(req.user.id);

        return res.json({
            ok: true,
            deleted_records: deleted.changes
        });
    }

    const recordId = req.query.id;
    if (
        typeof recordId !== "string" ||
        !RECORD_ID_PATTERN.test(recordId)
    ) {
        return res.status(400).json({ error: "Invalid record ID." });
    }

    db.prepare(`
        DELETE FROM records
        WHERE id = ? AND user_id = ?
    `).run(recordId, req.user.id);

    res.json({
        ok: true
    });
}

export function exportAccountData(req, res) {
    const readExport = db.transaction(() => {
        const user = db.prepare(`
            SELECT id, full_name, username, email, standard, board,
                   school, photo, timezone, created_at
            FROM users
            WHERE id = ?
        `).get(req.user.id);

        if (!user) return null;

        const records = db.prepare(`
            SELECT id, kind, data, created_at, updated_at
            FROM records
            WHERE user_id = ?
            ORDER BY created_at, id
        `).all(req.user.id).map(record => ({
            ...record,
            data: JSON.parse(record.data)
        }));

        const challengeHistory = db.prepare(`
            SELECT band, day_key, week_key, month_key, score, correct,
                   total, elapsed, official, created_at
            FROM challenge_attempts
            WHERE user_id = ?
            ORDER BY created_at, id
        `).all(req.user.id);
        const notifications = db.prepare(`
            SELECT id, type, title, message, priority, is_read, is_important,
                   action_url, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at, id
        `).all(req.user.id).map(notification => ({
            ...notification,
            is_read: Boolean(notification.is_read),
            is_important: Boolean(notification.is_important)
        }));
        const storedNotificationPreferences = db.prepare(`
            SELECT study_reminders, daily_goals, challenge_updates,
                   achievement_notifications, system_announcements
            FROM notification_preferences
            WHERE user_id = ?
        `).get(req.user.id);
        const notificationPreferences = Object.fromEntries([
            "study_reminders",
            "daily_goals",
            "challenge_updates",
            "achievement_notifications",
            "system_announcements"
        ].map(key => [
            key,
            Boolean(storedNotificationPreferences?.[key] ?? 0)
        ]));
        const privacyConsents = db.prepare(`
            SELECT purpose, version, granted_at
            FROM privacy_consents
            WHERE user_id = ?
            ORDER BY granted_at, id
        `).all(req.user.id);
        const challengeClaims = db.prepare(`
            SELECT day_key, claimed_at
            FROM challenge_daily_claims
            WHERE user_id = ?
            ORDER BY day_key
        `).all(req.user.id);

        return {
            user,
            records,
            challenge_history: challengeHistory,
            challenge_daily_claims: challengeClaims,
            notifications,
            notification_preferences: notificationPreferences,
            privacy_consents: privacyConsents
        };
    });

    res.set("Cache-Control", "no-store");
    const accountData = readExport.deferred();

    if (!accountData) {
        return res.status(404).json({
            error: "Account not found."
        });
    }

    res.json({
        exported_at: now(),
        ...accountData
    });
}

export function deleteAccount(req, res) {
    const password = req.body?.password;

    if (
        typeof password !== "string" ||
        password.length < 1 ||
        password.length > 128
    ) {
        return res.status(400).json({
            error: "Enter your current password to delete this account."
        });
    }

    const deleteOwnedAccount = db.transaction(() => {
        const user = db.prepare(`
            SELECT password_hash, password_salt
            FROM users
            WHERE id=?
        `).get(req.user.id);

        if (
            !user ||
            typeof user.password_hash !== "string" ||
            !/^[a-f0-9]{64}$/i.test(user.password_hash) ||
            typeof user.password_salt !== "string" ||
            !/^[a-f0-9]{32}$/i.test(user.password_salt)
        ) {
            return false;
        }

        const expected = Buffer.from(user.password_hash, "hex");
        const actual = Buffer.from(
            passwordHash(password, user.password_salt),
            "hex"
        );

        if (!crypto.timingSafeEqual(expected, actual)) {
            return false;
        }

        return db.prepare("DELETE FROM users WHERE id=?").run(req.user.id)
            .changes === 1;
    });

    if (!deleteOwnedAccount()) {
        return res.status(401).json({
            error: "Password is incorrect or the account no longer exists."
        });
    }

    res.set("Cache-Control", "no-store");
    res.clearCookie("studyflow_session", {
        httpOnly: true,
        sameSite: "lax",
        path: "/"
    });

    res.json({ ok: true });
}
