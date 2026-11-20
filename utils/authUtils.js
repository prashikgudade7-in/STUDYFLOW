import crypto from "node:crypto";
import db from "../config/database.js";
import { validateOriginConfig } from "../middleware/originMiddleware.js";

export const SESSION_DAYS = 14;

export const now = () => Math.floor(Date.now() / 1000);

export const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

export const passwordHash = (password, salt) =>
    crypto.pbkdf2Sync(
        password,
        Buffer.from(salt, "hex"),
        240000,
        32,
        "sha256"
    ).toString("hex");

export const safeUser = (row) => row ? ({
    id: row.id,
    name: row.full_name,
    username: row.username,
    email: row.email,
    standard: row.standard,
    board: row.board,
    school: row.school || "",
    photo: row.photo || "",
    timezone: row.timezone || "Asia/Kolkata"
}) : null;

export const userById = (id) =>
    safeUser(db.prepare("SELECT * FROM users WHERE id=?").get(id));

export function sessionCookie(res, req, userId, persistent = true) {
    const token = crypto.randomBytes(36).toString("base64url");

    const expiresAt = now() + SESSION_DAYS * 86400;
    const maxAge = SESSION_DAYS * 86400000;

    db.prepare(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)"
    ).run(
        hashToken(token),
        userId,
        expiresAt
    );

    const cookieOptions = {
        httpOnly: true,
        sameSite: "lax",
        secure: req.secure || new URL(validateOriginConfig()).protocol === "https:",
        path: "/"
    };

    if (persistent) cookieOptions.maxAge = maxAge;

    res.cookie("studyflow_session", token, cookieOptions);
}

export function cleanupExpiredSessions() {
    const result = db.prepare(`
        DELETE FROM sessions
        WHERE expires_at <= ?
    `).run(now());

    return result.changes;
}
