import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import test from "node:test";

const tempDir = mkdtempSync(path.join(os.tmpdir(), "studyflow-tests-"));
process.env.STUDYFLOW_DB_PATH = path.join(tempDir, "studyflow-test.sqlite");
process.env.NODE_ENV = "test";
process.env.APP_ORIGIN = "http://localhost:3000";

const { default: db, closeDatabase } = await import("../config/database.js");
const { login, logout, signup } = await import("../controllers/authController.js");
const {
    deleteAccount,
    exportAccountData
} = await import("../controllers/dataController.js");
const { auth } = await import("../middleware/authMiddleware.js");
const { loginLimiter } = await import("../middleware/rateLimitMiddleware.js");
const {
    cleanupExpiredLoginLimits,
    loginIdentifierRateLimit
} = await import("../middleware/loginIdentifierRateLimit.js");
const { validateOriginConfig } = await import("../middleware/originMiddleware.js");
const { hashToken } = await import("../utils/authUtils.js");

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

function response() {
    const listeners = new Map();
    return {
        statusCode: 200,
        headers: {},
        cookies: {},
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
        set(name, value) {
            this.headers[name] = value;
            return this;
        },
        cookie(name, value, options) {
            this.cookies[name] = { value, options };
            return this;
        },
        clearCookie(name, options) {
            this.clearedCookie = { name, options };
            return this;
        },
        once(event, callback) {
            listeners.set(event, callback);
            return this;
        },
        finish() {
            listeners.get("finish")?.();
        }
    };
}

function rateLimitResponse() {
    const res = response();
    res.set = function (name, value) {
        this.headers[name] = value;
        return this;
    };
    return res;
}

test("signup, login, session validation and logout preserve secure session handling", () => {
    process.env.APP_ORIGIN = "https://studyflow.example";

    const missingConsentRes = response();
    signup({
        body: {
            name: "Study Student",
            username: "test_student",
            email: "student@example.test",
            password: "correct-horse-battery",
            standard: "9",
            board: "CBSE"
        }
    }, missingConsentRes);
    assert.equal(missingConsentRes.statusCode, 400);
    assert.equal(missingConsentRes.cookies.studyflow_session, undefined);

    const signupRes = response();
    signup({
        secure: false,
        body: {
            name: "Study Student",
            username: "test_student",
            email: "student@example.test",
            password: "correct-horse-battery",
            standard: "9",
            board: "CBSE",
            privacy_notice_acknowledged: true
        }
    }, signupRes);

    assert.equal(signupRes.statusCode, 201);
    const signupSession = signupRes.cookies.studyflow_session;
    const consent = db.prepare(`
        SELECT purpose, version, granted_at
        FROM privacy_consents
        WHERE user_id = ?
    `).get(signupRes.body.user.id);
    assert.equal(consent.purpose, "core_service");
    assert.match(consent.version, /^\d{4}-\d{2}-\d{2}-v1$/);
    assert.ok(consent.granted_at > 0);
    assert.equal(signupSession.options.httpOnly, true);
    assert.equal(signupSession.options.sameSite, "lax");
    assert.equal(signupSession.options.secure, true);
    assert.equal(signupSession.options.maxAge, 14 * 86400000);
    assert.notEqual(
        db.prepare("SELECT token_hash FROM sessions WHERE user_id = ?")
            .get(signupRes.body.user.id).token_hash,
        signupSession.value
    );

    const badLoginRes = response();
    login({
        body: {
            identifier: "student@example.test",
            password: "incorrect-password"
        }
    }, badLoginRes);
    assert.equal(badLoginRes.statusCode, 401);

    const loginRes = response();
    login({
        secure: false,
        body: {
            identifier: "STUDENT@example.test",
            password: "correct-horse-battery"
        }
    }, loginRes);
    assert.equal(loginRes.statusCode, 200);
    const token = loginRes.cookies.studyflow_session.value;
    assert.equal(loginRes.cookies.studyflow_session.options.maxAge, 14 * 86400000);

    const sessionOnlyRes = response();
    login({
        secure: false,
        body: {
            identifier: "student@example.test",
            password: "correct-horse-battery",
            remember_me: false
        }
    }, sessionOnlyRes);
    assert.equal(sessionOnlyRes.statusCode, 200);
    assert.equal(
        sessionOnlyRes.cookies.studyflow_session.options.maxAge,
        undefined
    );
    assert.equal(
        db.prepare("SELECT expires_at FROM sessions WHERE token_hash = ?")
            .get(hashToken(sessionOnlyRes.cookies.studyflow_session.value))
            .expires_at > Math.floor(Date.now() / 1000),
        true
    );

    const invalidRememberPreferenceRes = response();
    login({
        body: {
            identifier: "student@example.test",
            password: "correct-horse-battery",
            remember_me: "false"
        }
    }, invalidRememberPreferenceRes);
    assert.equal(invalidRememberPreferenceRes.statusCode, 401);
    assert.equal(
        invalidRememberPreferenceRes.cookies.studyflow_session,
        undefined
    );

    let authenticated = false;
    auth({ cookies: { studyflow_session: token } }, response(), () => {
        authenticated = true;
    });
    assert.equal(authenticated, true);

    db.prepare("UPDATE sessions SET expires_at = 0 WHERE token_hash = ?")
        .run(hashToken(token));
    const expiredRes = response();
    auth({ cookies: { studyflow_session: token } }, expiredRes, () => {
        assert.fail("Expired session must not authenticate.");
    });
    assert.equal(expiredRes.statusCode, 401);

    const logoutRes = response();
    logout({ cookies: { studyflow_session: token } }, logoutRes);
    assert.equal(logoutRes.body.ok, true);
    assert.equal(
        db.prepare("SELECT 1 FROM sessions WHERE token_hash = ?")
            .get(hashToken(token)),
        undefined
    );
});

test("production origin config rejects HTTP and accepts a public HTTPS origin", () => {
    const originalEnvironment = process.env.NODE_ENV;
    const originalOrigin = process.env.APP_ORIGIN;

    try {
        process.env.NODE_ENV = "production";
        process.env.APP_ORIGIN = "http://studyflow.example";
        assert.throws(validateOriginConfig, /production requires HTTPS/);

        process.env.APP_ORIGIN = "https://studyflow.example";
        assert.equal(validateOriginConfig(), "https://studyflow.example");
    } finally {
        process.env.NODE_ENV = originalEnvironment;
        process.env.APP_ORIGIN = originalOrigin;
    }
});

test("account login rate limit is shared across client IPs and expires", () => {
    const identifier = `limit-${Date.now()}@example.test`;

    for (let attempt = 1; attempt <= 10; attempt += 1) {
        const res = rateLimitResponse();
        let continued = false;
        loginIdentifierRateLimit({
            ip: `192.0.2.${attempt}`,
            body: { identifier }
        }, res, () => {
            continued = true;
            res.statusCode = 401;
        });
        res.finish();
        assert.equal(continued, true);
    }

    const blockedRes = rateLimitResponse();
    let continued = false;
    loginIdentifierRateLimit({
        ip: "198.51.100.1",
        body: { identifier: identifier.toUpperCase() }
    }, blockedRes, () => {
        continued = true;
    });
    assert.equal(continued, false);
    assert.equal(blockedRes.statusCode, 429);
    assert.ok(Number(blockedRes.headers["Retry-After"]) > 0);

    const originalNow = Date.now;
    try {
        Date.now = () => originalNow() + 16 * 60 * 1000;
        const expiredRes = rateLimitResponse();
        let expiredContinued = false;
        loginIdentifierRateLimit({
            ip: "203.0.113.1",
            body: { identifier }
        }, expiredRes, () => {
            expiredContinued = true;
        });
        assert.equal(expiredContinued, true);
    } finally {
        Date.now = originalNow;
    }
    cleanupExpiredLoginLimits();
});

test("per-IP login limiter still blocks repeated requests", async () => {
    const app = express();
    app.use(express.json());
    app.post("/login", loginLimiter, (_req, res) => {
        res.status(401).json({ error: "invalid credentials" });
    });

    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const url = `http://127.0.0.1:${server.address().port}/login`;

    try {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const result = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: "ip-limit@example.test" })
            });
            assert.equal(result.status, 401);
        }

        const limited = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: "ip-limit@example.test" })
        });
        assert.equal(limited.status, 429);
    } finally {
        server.close();
        await once(server, "close");
    }
});

test("SQLite foreign keys remain enabled for user-owned records", () => {
    assert.equal(db.pragma("foreign_keys", { simple: true }), 1);
    assert.throws(() => {
        db.prepare(`
            INSERT INTO records(id, user_id, kind, data, created_at, updated_at)
            VALUES(?, ?, ?, ?, ?, ?)
        `).run("orphan-record", -1, "task", "{}", 1, 1);
    }, /FOREIGN KEY constraint failed/);
});

test("account export excludes credentials and deletion removes all owned data", () => {
    const suffix = Date.now().toString();
    const signupRes = response();
    signup({
        body: {
            name: "Delete Test",
            username: `delete_${suffix}`,
            email: `delete-${suffix}@example.test`,
            password: "test-password-123",
            standard: "9",
            board: "CBSE",
            privacy_notice_acknowledged: true
        }
    }, signupRes);

    assert.equal(signupRes.statusCode, 201);
    const userId = signupRes.body.user.id;
    db.prepare(`
        INSERT INTO records(id, user_id, kind, data, created_at, updated_at)
        VALUES(?, ?, ?, ?, ?, ?)
    `).run("export-record", userId, "task", '{"title":"Study"}', 1, 2);
    db.prepare(`
        INSERT INTO challenge_attempts(
            user_id, band, day_key, week_key, month_key, score,
            correct, total, elapsed, official, created_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, "7-9", "2026-11-19", "2026-W47", "2026-11", 100, 1, 1, 4, 1, 3);
    db.prepare(`
        INSERT INTO challenge_sessions(
            attempt_id, user_id, band, day_key, week_key, month_key,
            questions_json, official, created_at, expires_at, status
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("delete-test-attempt", userId, "7-9", "2026-11-19", "2026-W47", "2026-11", "[]", 1, 1, 10, "pending");

    const exportRes = response();
    exportAccountData({ user: signupRes.body.user }, exportRes);
    assert.equal(exportRes.body.user.email, `delete-${suffix}@example.test`);
    assert.equal(exportRes.body.records[0].data.title, "Study");
    assert.equal(exportRes.body.challenge_history[0].score, 100);
    assert.equal(JSON.stringify(exportRes.body).includes("password_hash"), false);
    assert.equal(JSON.stringify(exportRes.body).includes("password_salt"), false);

    const wrongPasswordRes = response();
    deleteAccount({
        user: signupRes.body.user,
        body: { password: "wrong-password" }
    }, wrongPasswordRes);
    assert.equal(wrongPasswordRes.statusCode, 401);
    assert.ok(db.prepare("SELECT id FROM users WHERE id=?").get(userId));

    const deleteRes = response();
    deleteAccount({
        user: signupRes.body.user,
        body: { password: "test-password-123" }
    }, deleteRes);
    assert.equal(deleteRes.statusCode, 200);
    assert.deepEqual(deleteRes.body, { ok: true });
    assert.equal(deleteRes.clearedCookie.name, "studyflow_session");
    assert.equal(db.prepare("SELECT id FROM users WHERE id=?").get(userId), undefined);
    assert.equal(db.prepare("SELECT id FROM records WHERE user_id=?").get(userId), undefined);
    assert.equal(db.prepare("SELECT id FROM challenge_attempts WHERE user_id=?").get(userId), undefined);
    assert.equal(db.prepare("SELECT attempt_id FROM challenge_sessions WHERE user_id=?").get(userId), undefined);
    assert.equal(db.prepare("SELECT token_hash FROM sessions WHERE user_id=?").get(userId), undefined);
});

test("production server returns health status and HSTS without external services", async () => {
    const reservation = net.createServer();
    reservation.listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const port = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));

    const serverDatabase = path.join(tempDir, "production-test.sqlite");
    const child = spawn(process.execPath, [path.join(projectRoot, "server.js")], {
        cwd: projectRoot,
        env: {
            ...process.env,
            NODE_ENV: "production",
            APP_ORIGIN: "https://studyflow.example",
            PORT: String(port),
            STUDYFLOW_DB_PATH: serverDatabase,
            TRUST_PROXY: ""
        },
        stdio: ["ignore", "ignore", "pipe"]
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", chunk => {
        stderr += chunk;
    });

    try {
        let result;
        for (let attempt = 0; attempt < 50; attempt += 1) {
            if (child.exitCode !== null) {
                throw new Error(`Production server exited early: ${stderr}`);
            }

            try {
                result = await fetch(`http://127.0.0.1:${port}/api/healthz`);
                break;
            } catch {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        assert.ok(result, `Production server did not start: ${stderr}`);
        assert.equal(result.status, 200);
        assert.equal(result.headers.get("strict-transport-security"), "max-age=31536000");
        assert.deepEqual(await result.json(), { status: "ok" });

        const page = await fetch(`http://127.0.0.1:${port}/`);
        assert.equal(page.status, 200);
        const policy = page.headers.get("content-security-policy");
        assert.match(policy, /font-src 'self'/);
        assert.equal(policy.includes("fonts.googleapis.com"), false);
        assert.equal(policy.includes("fonts.gstatic.com"), false);
    } finally {
        child.kill("SIGTERM");
        await once(child, "close");
    }
});

test.after(() => {
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
});
