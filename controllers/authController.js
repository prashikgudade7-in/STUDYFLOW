import crypto from "node:crypto";
import db from "../config/database.js";

import {
    passwordHash,
    hashToken,
    now,
    safeUser,
    userById,
    sessionCookie
} from "../utils/authUtils.js";
import { recordCoreServiceConsent } from "../services/privacyConsentService.js";

// GET CURRENT USER
export function getMe(req, res) {
    const token = req.cookies.studyflow_session;

    const row = token && db.prepare(`
        SELECT u.*
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
        AND s.expires_at > ?
    `).get(hashToken(token), now());

    res.json({ user: safeUser(row) });
}

// SIGNUP
export function signup(req, res) {
    const {
        name = "",
        username = "",
        email = "",
        password = "",
        standard = "",
        board = "",
        privacy_notice_acknowledged
    } = req.body || {};

    const cleanName = String(name).trim();
    const cleanUser = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (
        cleanName.length < 2 ||
        cleanName.length > 80 ||
        cleanUser.length < 3 ||
        cleanUser.length > 30 ||
        !/^[A-Za-z0-9_]+$/.test(cleanUser) ||
        cleanEmail.length > 254 ||
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail) ||
        typeof password !== "string" ||
        password.length < 8 ||
        password.length > 128 ||
        privacy_notice_acknowledged !== true ||
        !["7", "8", "9", "10", "11", "12"].includes(String(standard)) ||
        ![
            "CBSE",
            "ICSE",
            "Maharashtra State Board",
            "Other State Board",
            "Other"
        ].includes(String(board))
    ) {
        return res.status(400).json({
            error: "Enter valid registration details, a password of at least 8 characters, and accept the core data-use purpose."
        });
    }

    const salt = crypto.randomBytes(16).toString("hex");

    try {
        const createdAt = now();
        const createAccount = db.transaction(() => {
            const result = db.prepare(`
                INSERT INTO users(
                    full_name, username, email,
                    password_hash, password_salt,
                    standard, board, created_at
                )
                VALUES(?,?,?,?,?,?,?,?)
            `).run(
                cleanName,
                cleanUser,
                cleanEmail,
                passwordHash(String(password), salt),
                salt,
                String(standard),
                String(board),
                createdAt
            );

            recordCoreServiceConsent(result.lastInsertRowid, createdAt);
            return result.lastInsertRowid;
        });
        const userId = createAccount.immediate();

        sessionCookie(res, req, userId);

        res.status(201).json({
            user: userById(userId)
        });

    } catch (e) {
        if (String(e.code).startsWith("SQLITE_CONSTRAINT")) {
            return res.status(409).json({
                error: "That email or username is already registered."
            });
        }

        throw e;
    }
}

// LOGIN
export function login(req, res) {
    const rawIdentifier = req.body?.identifier;
    const password = req.body?.password;

    if (
        typeof rawIdentifier !== "string" ||
        rawIdentifier.trim().length > 254 ||
        typeof password !== "string" ||
        !password.length ||
        password.length > 128 ||
        (req.body?.remember_me !== undefined &&
            typeof req.body.remember_me !== "boolean")
    ) {
        return res.status(401).json({
            error: "Email/username or password is incorrect."
        });
    }

    const ident = rawIdentifier.trim();

    const row = db.prepare(`
        SELECT *
        FROM users
        WHERE email = ? COLLATE NOCASE
        OR username = ? COLLATE NOCASE
    `).get(ident, ident);

    const valid = row &&
        typeof row.password_hash === "string" &&
        /^[a-f0-9]{64}$/i.test(row.password_hash) &&
        typeof row.password_salt === "string" &&
        /^[a-f0-9]{32}$/i.test(row.password_salt) &&
        crypto.timingSafeEqual(
            Buffer.from(passwordHash(password, row.password_salt), "hex"),
            Buffer.from(row.password_hash, "hex")
        );

    if (!valid) {
        return res.status(401).json({
            error: "Email/username or password is incorrect."
        });
    }

    sessionCookie(res, req, row.id, req.body?.remember_me !== false);

    res.json({ user: safeUser(row) });
}

// LOGOUT
export function logout(req, res) {
    const token = req.cookies.studyflow_session;

    if (token) {
        db.prepare(
            "DELETE FROM sessions WHERE token_hash = ?"
        ).run(hashToken(token));
    }

    res.clearCookie("studyflow_session", {
        httpOnly: true,
        sameSite: "lax",
        path: "/"
    });

    res.json({ ok: true });
}
