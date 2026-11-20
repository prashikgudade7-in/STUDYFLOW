import assert from "node:assert/strict";
import crypto from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import cookieParser from "cookie-parser";
import express from "express";
import test from "node:test";

const tempDir = mkdtempSync(path.join(os.tmpdir(), "studyflow-privacy-tests-"));
process.env.STUDYFLOW_DB_PATH = path.join(tempDir, "privacy.sqlite");
process.env.NODE_ENV = "test";

const { default: db, closeDatabase } = await import("../config/database.js");
const { hashToken, now, passwordHash } = await import("../utils/authUtils.js");
const {
    cleanupExpiredChallengeData,
    getOfficialChallengeDateKeys,
    startChallenge,
    ChallengeError
} =
    await import("../services/challengeService.js");
const dataRoutes = (await import("../routes/dataRoutes.js")).default;
const privacyRoutes = (await import("../routes/privacyRoutes.js")).default;
const challengeRoutes = (await import("../routes/challengeRoutes.js")).default;

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use("/api", dataRoutes);
app.use("/api", privacyRoutes);
app.use("/api", challengeRoutes);

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
let userSequence = 0;

function createUser() {
    userSequence += 1;
    const salt = crypto.randomBytes(16).toString("hex");
    const password = "privacy-test-password";
    const userId = db.prepare(`
        INSERT INTO users(
            full_name, username, email, password_hash, password_salt,
            standard, board, created_at
        )
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        `Privacy Student ${userSequence}`,
        `privacy_student_${userSequence}`,
        `privacy${userSequence}@example.test`,
        passwordHash(password, salt),
        salt,
        "9",
        "CBSE",
        now()
    ).lastInsertRowid;
    const token = crypto.randomBytes(32).toString("base64url");
    db.prepare(`
        INSERT INTO sessions(token_hash, user_id, expires_at)
        VALUES(?, ?, ?)
    `).run(hashToken(token), userId, now() + 3600);

    return {
        id: Number(userId),
        token,
        password,
        standard: "9"
    };
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
        headers: response.headers,
        body: await response.json()
    };
}

test("privacy consent routes require authentication and explicit affirmative acceptance", async () => {
    assert.equal((await request("/privacy/consent")).status, 401);
    assert.equal((await request("/privacy/consent", {
        method: "PUT",
        body: { accepted: true }
    })).status, 401);

    const user = createUser();
    const initial = await request("/privacy/consent", { token: user.token });
    assert.equal(initial.status, 200);
    assert.equal(initial.body.consent, null);

    const rejected = await request("/privacy/consent", {
        token: user.token,
        method: "PUT",
        body: { accepted: false }
    });
    assert.equal(rejected.status, 400);

    const accepted = await request("/privacy/consent", {
        token: user.token,
        method: "PUT",
        body: { accepted: true }
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.consent.purpose, "core_service");
    assert.match(accepted.body.consent.version, /^\d{4}-\d{2}-\d{2}-v1$/);
    assert.ok(accepted.body.consent.granted_at > 0);

    const repeated = await request("/privacy/consent", {
        token: user.token,
        method: "PUT",
        body: { accepted: true }
    });
    assert.equal(repeated.body.consent.granted_at, accepted.body.consent.granted_at);
});

test("exports are authenticated, consistent, and scoped to the requesting user", async () => {
    const owner = createUser();
    const other = createUser();
    await request("/privacy/consent", {
        token: owner.token,
        method: "PUT",
        body: { accepted: true }
    });

    for (const [user, recordId] of [[owner, "owner-record"], [other, "other-record"]]) {
        db.prepare(`
            INSERT INTO records(id, user_id, kind, data, created_at, updated_at)
            VALUES(?, ?, ?, ?, ?, ?)
        `).run(recordId, user.id, "task", JSON.stringify({ title: recordId }), now(), now());
    }

    db.prepare(`
        INSERT INTO notifications(
            user_id, event_key, type, title, message, created_at
        )
        VALUES(?, ?, ?, ?, ?, ?)
    `).run(owner.id, "privacy-export-event", "system", "Notice", "Account notice", now());
    db.prepare(`
        INSERT INTO notification_preferences(user_id, challenge_updates)
        VALUES(?, 1)
    `).run(owner.id);

    const unauthorized = await request("/account/export");
    assert.equal(unauthorized.status, 401);

    const exported = await request("/account/export", { token: owner.token });
    assert.equal(exported.status, 200);
    assert.equal(exported.headers.get("cache-control"), "no-store");
    assert.deepEqual(exported.body.records.map(record => record.id), ["owner-record"]);
    assert.equal(exported.body.notifications[0].event_key, undefined);
    assert.equal(exported.body.notifications[0].title, "Notice");
    assert.equal(exported.body.notification_preferences.challenge_updates, true);
    assert.equal(exported.body.notification_preferences.study_reminders, false);
    assert.equal(exported.body.privacy_consents.length, 1);
    assert.equal(JSON.stringify(exported.body).includes("password_hash"), false);
    assert.equal(JSON.stringify(exported.body).includes("password_salt"), false);
    assert.equal(JSON.stringify(exported.body).includes("token_hash"), false);
    assert.equal(JSON.stringify(exported.body).includes("other-record"), false);
});

test("study-record deletion requires confirmation and only deletes the owner’s records", async () => {
    const owner = createUser();
    const other = createUser();
    for (const [user, recordId] of [[owner, "clear-owner"], [other, "clear-other"]]) {
        db.prepare(`
            INSERT INTO records(id, user_id, kind, data, created_at, updated_at)
            VALUES(?, ?, ?, ?, ?, ?)
        `).run(recordId, user.id, "task", "{}", now(), now());
    }

    const rejected = await request("/data", {
        token: owner.token,
        method: "DELETE",
        body: { confirm: false }
    });
    assert.equal(rejected.status, 400);

    const cleared = await request("/data", {
        token: owner.token,
        method: "DELETE",
        body: { confirm: true }
    });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.deleted_records, 1);
    assert.equal(db.prepare("SELECT id FROM records WHERE user_id = ?").get(owner.id), undefined);
    assert.equal(db.prepare("SELECT id FROM records WHERE user_id = ?").get(other.id).id, "clear-other");
});

test("challenge-history deletion removes user results but keeps today's fairness claim", async () => {
    const owner = createUser();
    const other = createUser();
    const dates = getOfficialChallengeDateKeys();
    const timestamp = now();

    for (const [user, score] of [[owner, 12], [other, 8]]) {
        db.prepare(`
            INSERT INTO challenge_attempts(
                user_id, band, day_key, week_key, month_key, score, correct,
                total, elapsed, official, created_at
            )
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `).run(
            user.id,
            "9-10",
            dates.day,
            dates.week,
            dates.month,
            score,
            score,
            15,
            30,
            timestamp
        );
    }
    db.prepare(`
        INSERT INTO notifications(
            user_id, event_key, type, title, message, created_at
        )
        VALUES(?, ?, 'challenge', ?, ?, ?)
    `).run(owner.id, "challenge:clear", "Result", "Score recorded", timestamp);
    db.prepare(`
        INSERT INTO notifications(
            user_id, event_key, type, title, message, created_at
        )
        VALUES(?, ?, 'system', ?, ?, ?)
    `).run(owner.id, "system:keep", "System", "Keep this", timestamp);
    db.prepare(`
        INSERT INTO records(id, user_id, kind, data, created_at, updated_at)
        VALUES('challenge_stats', ?, 'achievement', '{}', ?, ?)
    `).run(owner.id, timestamp, timestamp);

    const rejected = await request("/challenge/history", {
        token: owner.token,
        method: "DELETE",
        body: { confirm: false }
    });
    assert.equal(rejected.status, 400);

    const deleted = await request("/challenge/history", {
        token: owner.token,
        method: "DELETE",
        body: { confirm: true }
    });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.deleted_attempts, 1);
    assert.equal(deleted.body.deleted_challenge_stats, 1);
    assert.equal(db.prepare(
        "SELECT id FROM challenge_attempts WHERE user_id = ?"
    ).get(owner.id), undefined);
    assert.equal(db.prepare(
        "SELECT score FROM challenge_attempts WHERE user_id = ?"
    ).get(other.id).score, 8);
    assert.equal(db.prepare(
        "SELECT 1 FROM notifications WHERE user_id = ? AND type = 'challenge'"
    ).get(owner.id), undefined);
    assert.ok(db.prepare(`
        SELECT 1 FROM notifications WHERE user_id = ? AND event_key = ?
    `).get(owner.id, "system:keep"));
    assert.equal(db.prepare(`
        SELECT 1 FROM records WHERE user_id = ? AND id = 'challenge_stats'
    `).get(owner.id), undefined);
    assert.ok(db.prepare(`
        SELECT 1 FROM challenge_daily_claims WHERE user_id = ? AND day_key = ?
    `).get(owner.id, dates.day));
    assert.throws(
        () => startChallenge(owner, true),
        error => error instanceof ChallengeError && error.status === 409
    );
});

test("expired challenge question sets and prior-day claim markers are cleaned up", () => {
    const user = createUser();
    const yesterday = getOfficialChallengeDateKeys(now() - 86400);
    const attempt = startChallenge(user, true, now() - 86400);
    db.prepare(`
        INSERT INTO challenge_daily_claims(user_id, day_key, claimed_at)
        VALUES(?, ?, ?)
    `).run(user.id, yesterday.day, now() - 86400);

    const deleted = cleanupExpiredChallengeData();

    assert.ok(deleted.sessions >= 1);
    assert.ok(deleted.claims >= 1);
    assert.equal(db.prepare(
        "SELECT attempt_id FROM challenge_sessions WHERE attempt_id = ?"
    ).get(attempt.attempt_id), undefined);
    assert.equal(db.prepare(`
        SELECT day_key FROM challenge_daily_claims
        WHERE user_id = ? AND day_key = ?
    `).get(user.id, yesterday.day), undefined);
});

test("account deletion withdraws core-service consent and cascades only owned data", async () => {
    const owner = createUser();
    const other = createUser();
    await request("/privacy/consent", {
        token: owner.token,
        method: "PUT",
        body: { accepted: true }
    });
    db.prepare(`
        INSERT INTO records(id, user_id, kind, data, created_at, updated_at)
        VALUES(?, ?, ?, ?, ?, ?)
    `).run("withdraw-record", owner.id, "task", "{}", now(), now());

    const unauthorized = await request("/account", {
        method: "DELETE",
        body: { password: owner.password }
    });
    assert.equal(unauthorized.status, 401);

    const wrongPassword = await request("/account", {
        token: owner.token,
        method: "DELETE",
        body: { password: "incorrect-password" }
    });
    assert.equal(wrongPassword.status, 401);
    assert.ok(db.prepare("SELECT id FROM users WHERE id = ?").get(owner.id));

    const deleted = await request("/account", {
        token: owner.token,
        method: "DELETE",
        body: { password: owner.password }
    });
    assert.equal(deleted.status, 200);
    assert.equal(db.prepare("SELECT id FROM users WHERE id = ?").get(owner.id), undefined);
    assert.equal(db.prepare("SELECT id FROM records WHERE user_id = ?").get(owner.id), undefined);
    assert.equal(db.prepare("SELECT id FROM privacy_consents WHERE user_id = ?").get(owner.id), undefined);
    assert.ok(db.prepare("SELECT id FROM users WHERE id = ?").get(other.id));
});

test.after(async () => {
    await new Promise(resolve => server.close(resolve));
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
});
