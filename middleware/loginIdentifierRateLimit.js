import crypto from "node:crypto";
import db from "../config/database.js";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 10;

const findLimit = db.prepare(`
    SELECT attempts, expires_at
    FROM login_attempt_limits
    WHERE identifier_hash = ?
`);

const insertLimit = db.prepare(`
    INSERT INTO login_attempt_limits(
        identifier_hash, window_started_at, attempts, expires_at
    )
    VALUES(?, ?, 1, ?)
    ON CONFLICT(identifier_hash) DO UPDATE SET
        window_started_at = excluded.window_started_at,
        attempts = 1,
        expires_at = excluded.expires_at
`);

const incrementLimit = db.prepare(`
    UPDATE login_attempt_limits
    SET attempts = attempts + 1
    WHERE identifier_hash = ?
`);

const recordAttempt = db.transaction((identifierHash, now) => {
    const current = findLimit.get(identifierHash);

    if (!current || current.expires_at <= now) {
        insertLimit.run(identifierHash, now, now + WINDOW_SECONDS);
        return { attempts: 1, expiresAt: now + WINDOW_SECONDS };
    }

    incrementLimit.run(identifierHash);
    return {
        attempts: current.attempts + 1,
        expiresAt: current.expires_at
    };
}).immediate;

const resetLimit = db.prepare(`
    DELETE FROM login_attempt_limits
    WHERE identifier_hash = ?
`);

export function loginIdentifierRateLimit(req, res, next) {
    const identifier = typeof req.body?.identifier === "string"
        ? req.body.identifier.trim().toLowerCase().slice(0, 254)
        : "";
    const identifierHash = crypto
        .createHash("sha256")
        .update(identifier)
        .digest("hex");
    const now = Math.floor(Date.now() / 1000);
    const limit = recordAttempt(identifierHash, now);

    res.once("finish", () => {
        if (res.statusCode < 400) {
            resetLimit.run(identifierHash);
        }
    });

    if (limit.attempts > MAX_ATTEMPTS) {
        res.set("Retry-After", String(Math.max(1, limit.expiresAt - now)));
        return res.status(429).json({
            error: "Too many login attempts for this account. Please try again later."
        });
    }

    next();
}

export function cleanupExpiredLoginLimits() {
    return db.prepare(`
        DELETE FROM login_attempt_limits
        WHERE expires_at <= ?
    `).run(Math.floor(Date.now() / 1000)).changes;
}
