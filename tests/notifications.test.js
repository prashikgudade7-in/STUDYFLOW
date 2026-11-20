import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, test } from "node:test";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import cookieParser from "cookie-parser";
import express from "express";

const tempDir = mkdtempSync(path.join(os.tmpdir(), "studyflow-notification-tests-"));
process.env.STUDYFLOW_DB_PATH = path.join(tempDir, "notifications.sqlite");
process.env.NODE_ENV = "test";

const { default: db, closeDatabase } = await import("../config/database.js");
const { hashToken } = await import("../utils/authUtils.js");
const {
    createNotificationFromEvent,
    NOTIFICATION_PREFERENCES
} = await import("../services/notificationService.js");
const {
    startChallenge,
    submitChallengeAttempt
} = await import("../services/challengeService.js");
const notificationRoutes = (await import("../routes/notificationRoutes.js")).default;

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use("/api", notificationRoutes);

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
let userSequence = 0;

function createUser() {
    userSequence += 1;
    const userId = db.prepare(`
        INSERT INTO users(
            full_name, username, email, password_hash, password_salt,
            standard, board, created_at
        )
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        `Notification Student ${userSequence}`,
        `notification_student_${userSequence}`,
        `notification${userSequence}@example.test`,
        "test-hash",
        "0".repeat(32),
        "9",
        "CBSE",
        Math.floor(Date.now() / 1000)
    ).lastInsertRowid;
    const token = crypto.randomBytes(32).toString("base64url");
    db.prepare(`
        INSERT INTO sessions(token_hash, user_id, expires_at)
        VALUES(?, ?, ?)
    `).run(hashToken(token), userId, Math.floor(Date.now() / 1000) + 3600);

    return { id: Number(userId), token, standard: "9" };
}

function createNotification(userId, eventKey, overrides = {}) {
    const preference = {
        challenge: "challenge_updates",
        system: "system_announcements",
        study_reminder: "study_reminders",
        daily_goal: "daily_goals",
        achievement: "achievement_notifications"
    }[overrides.type || "challenge"];

    db.prepare(`
        INSERT OR IGNORE INTO notification_preferences(user_id)
        VALUES(?)
    `).run(userId);
    db.prepare(`
        UPDATE notification_preferences
        SET ${preference} = 1
        WHERE user_id = ?
    `).run(userId);

    return db.transaction(() => createNotificationFromEvent({
        userId,
        eventKey,
        type: "challenge",
        title: "Your challenge result is ready",
        message: "You scored 4 out of 15 in today's challenge.",
        actionUrl: "/#challenge",
        createdAt: Math.floor(Date.now() / 1000),
        ...overrides
    })).immediate();
}

async function request(pathname, { token, method = "GET", body } = {}) {
    const headers = {};
    if (token) headers.cookie = `studyflow_session=${token}`;
    if (body !== undefined) headers["content-type"] = "application/json";
    const response = await fetch(`${baseUrl}${pathname}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    return {
        status: response.status,
        body: await response.json()
    };
}

function answersFor(attemptId) {
    return JSON.parse(db.prepare(`
        SELECT questions_json
        FROM challenge_sessions
        WHERE attempt_id = ?
    `).get(attemptId).questions_json).map(question => question.correctIndex);
}

after(async () => {
    await new Promise(resolve => server.close(resolve));
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
});

test("notification APIs require an authenticated session", async () => {
    const requests = [
        ["/notifications", "GET"],
        ["/notifications/unread-count", "GET"],
        ["/notifications/preferences", "GET"],
        ["/notifications/preferences", "PUT"],
        ["/notifications/read-all", "PATCH"],
        ["/notifications", "DELETE"]
    ];

    for (const [pathname, method] of requests) {
        const response = await request(pathname, {
            method,
            body: method === "PUT" ? {} : undefined
        });
        assert.equal(response.status, 401, `${method} ${pathname}`);
    }
});

test("only verified official challenge results create notifications, once", () => {
    const user = createUser();
    db.prepare(`
        INSERT INTO notification_preferences(user_id, challenge_updates)
        VALUES(?, 1)
    `).run(user.id);
    const attempt = startChallenge(user, true);
    const result = submitChallengeAttempt(user, attempt.attempt_id, answersFor(attempt.attempt_id));
    const notifications = db.prepare(`
        SELECT user_id, event_key, type, title, message, action_url
        FROM notifications
        WHERE user_id = ?
    `).all(user.id);

    assert.equal(result.official, true);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].event_key, `challenge:${attempt.attempt_id}`);
    assert.equal(notifications[0].type, "challenge");
    assert.equal(notifications[0].action_url, "/#challenge");
    assert.match(notifications[0].message, /scored 15 out of 15/);

    const duplicate = createNotification(user.id, `challenge:${attempt.attempt_id}`);
    assert.equal(duplicate, null);
    assert.equal(db.prepare(
        "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?"
    ).get(user.id).count, 1);

    const practiceUser = createUser();
    const practice = startChallenge(practiceUser, false);
    submitChallengeAttempt(
        practiceUser,
        practice.attempt_id,
        answersFor(practice.attempt_id)
    );
    assert.equal(db.prepare(
        "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?"
    ).get(practiceUser.id).count, 0);
});

test("notification reads, filters and mutations stay within the owning account", async () => {
    const owner = createUser();
    const other = createUser();
    const challengeId = createNotification(owner.id, "challenge:event:1", { priority: "high" });
    const systemId = createNotification(owner.id, "system:event:1", {
        type: "system",
        title: "StudyFlow update",
        message: "A brief system notice.",
        actionUrl: "/#settings"
    });
    createNotification(other.id, "challenge:event:2");

    const ownerList = await request("/notifications", { token: owner.token });
    assert.equal(ownerList.status, 200);
    assert.equal(ownerList.body.notifications.length, 2);
    assert.equal(ownerList.body.unread_count, 2);
    assert.equal((await request("/notifications?filter=unread", {
        token: owner.token
    })).body.notifications.length, 2);

    const otherList = await request("/notifications", { token: other.token });
    assert.equal(otherList.body.notifications.length, 1);
    assert.notEqual(otherList.body.notifications[0].id, challengeId);

    const important = await request(`/notifications/${challengeId}/important`, {
        token: owner.token,
        method: "PATCH",
        body: { is_important: true }
    });
    assert.equal(important.status, 200);
    assert.equal(important.body.is_important, true);

    const importantList = await request("/notifications?filter=important", {
        token: owner.token
    });
    assert.deepEqual(
        importantList.body.notifications.map(notification => notification.id),
        [challengeId]
    );

    const systemList = await request("/notifications?filter=system", {
        token: owner.token
    });
    assert.deepEqual(
        systemList.body.notifications.map(notification => notification.id),
        [systemId]
    );

    assert.equal((await request("/notifications?filter=study_reminders", {
        token: owner.token
    })).body.notifications.length, 0);
    assert.equal((await request("/notifications?filter=challenges", {
        token: owner.token
    })).body.notifications.length, 1);
    assert.equal((await request("/notifications", {
        token: other.token,
        method: "DELETE"
    })).body.deleted, 1);

    for (const [pathname, method, body] of [
        [`/notifications/${challengeId}/read`, "PATCH", {}],
        [`/notifications/${challengeId}/important`, "PATCH", { is_important: false }],
        [`/notifications/${challengeId}`, "DELETE", undefined]
    ]) {
        const response = await request(pathname, {
            token: other.token,
            method,
            body
        });
        assert.equal(response.status, 404, `${method} ${pathname}`);
    }

    assert.equal(db.prepare(
        "SELECT is_read FROM notifications WHERE id = ? AND user_id = ?"
    ).get(challengeId, owner.id).is_read, 0);
    assert.equal(db.prepare(
        "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?"
    ).get(owner.id).count, 2);
});

test("read, delete and clear operations update unread counts", async () => {
    const user = createUser();
    const first = createNotification(user.id, "challenge:read:1");
    const second = createNotification(user.id, "challenge:read:2");

    const initialCount = await request("/notifications/unread-count", {
        token: user.token
    });
    assert.equal(initialCount.body.unread_count, 2);

    const read = await request(`/notifications/${first}/read`, {
        token: user.token,
        method: "PATCH",
        body: {}
    });
    assert.equal(read.status, 200);
    assert.equal(read.body.unread_count, 1);

    const invalidId = await request("/notifications/0/read", {
        token: user.token,
        method: "PATCH",
        body: {}
    });
    assert.equal(invalidId.status, 400);

    const markAll = await request("/notifications/read-all", {
        token: user.token,
        method: "PATCH",
        body: {}
    });
    assert.equal(markAll.body.unread_count, 0);

    const deleted = await request(`/notifications/${second}`, {
        token: user.token,
        method: "DELETE"
    });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.unread_count, 0);

    createNotification(user.id, "challenge:clear:1");
    createNotification(user.id, "challenge:clear:2");
    const cleared = await request("/notifications", {
        token: user.token,
        method: "DELETE"
    });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.deleted, 3);
    assert.equal((await request("/notifications", { token: user.token })).body.notifications.length, 0);
});

test("notification preferences validate and suppress disabled event categories", async () => {
    const user = createUser();
    const defaults = await request("/notifications/preferences", {
        token: user.token
    });
    assert.equal(defaults.status, 200);
    assert.deepEqual(Object.keys(defaults.body.preferences).sort(), [...NOTIFICATION_PREFERENCES].sort());
    assert.ok(Object.values(defaults.body.preferences).every(value => !value));

    const preferences = Object.fromEntries(
        NOTIFICATION_PREFERENCES.map(key => [key, true])
    );
    preferences.challenge_updates = false;
    const saved = await request("/notifications/preferences", {
        token: user.token,
        method: "PUT",
        body: preferences
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.preferences.challenge_updates, false);

    const invalid = await request("/notifications/preferences", {
        token: user.token,
        method: "PUT",
        body: { ...preferences, unknown: true }
    });
    assert.equal(invalid.status, 400);

    const suppressed = createNotificationFromEvent({
        userId: user.id,
        eventKey: "challenge:disabled:1",
        type: "challenge",
        title: "Your challenge result is ready",
        message: "You scored 4 out of 15 in today's challenge.",
        actionUrl: "/#challenge"
    });
    assert.equal(suppressed, null);
    assert.equal(db.prepare(
        "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?"
    ).get(user.id).count, 0);
});

test("notification filters and pagination reject invalid values", async () => {
    const user = createUser();
    assert.equal((await request("/notifications?filter=all%27%20OR%201%3D1", {
        token: user.token
    })).status, 400);
    assert.equal((await request("/notifications?page=99999", {
        token: user.token
    })).status, 400);
});

test("notification pages are bounded and older rows are accessible", async () => {
    const user = createUser();
    for (let index = 0; index < 51; index += 1) {
        createNotification(user.id, `challenge:page:${index}`);
    }

    const first = await request("/notifications?page=0", { token: user.token });
    assert.equal(first.status, 200);
    assert.equal(first.body.notifications.length, 50);
    assert.equal(first.body.has_more, true);
    assert.equal(first.body.next_page, 1);

    const second = await request("/notifications?page=1", { token: user.token });
    assert.equal(second.body.notifications.length, 1);
    assert.equal(second.body.has_more, false);
    assert.equal(second.body.next_page, null);
});

test("notification action URLs must be allowlisted", () => {
    const user = createUser();
    assert.throws(
        () => createNotification(user.id, "invalid-action", {
            actionUrl: "javascript:alert(1)"
        }),
        /Invalid notification event/
    );
});

test("notification records and preferences cascade when an account is deleted", () => {
    const user = createUser();
    createNotification(user.id, "challenge:cascade:1");
    db.prepare(`
        UPDATE notification_preferences
        SET challenge_updates = 0
        WHERE user_id = ?
    `).run(user.id);

    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);

    assert.equal(db.prepare(
        "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?"
    ).get(user.id).count, 0);
    assert.equal(db.prepare(
        "SELECT COUNT(*) AS count FROM notification_preferences WHERE user_id = ?"
    ).get(user.id).count, 0);
});
