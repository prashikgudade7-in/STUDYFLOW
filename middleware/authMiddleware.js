import db from "../config/database.js";

import {
    hashToken,
    now,
    safeUser
} from "../utils/authUtils.js";

export function auth(req, res, next) {
    try {
        const token = req.cookies?.studyflow_session;

        if (!token) {
            return res.status(401).json({
                error: "Please sign in to continue."
            });
        }

        const row = db.prepare(`
            SELECT u.*
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = ?
            AND s.expires_at > ?
        `).get(hashToken(token), now());

        if (!row) {
            return res.status(401).json({
                error: "Please sign in to continue."
            });
        }

        req.user = safeUser(row);

        next();

    } catch (error) {
        next(error);
    }
}
