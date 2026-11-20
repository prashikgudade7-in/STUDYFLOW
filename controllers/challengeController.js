import db from "../config/database.js";
import { now } from "../utils/authUtils.js";
import {
    ChallengeError,
    getChallengeStatus as readChallengeStatus,
    getOfficialChallengeDateKeys,
    startChallenge as createChallenge,
    submitChallengeAttempt
} from "../services/challengeService.js";

function sendChallengeError(error, res) {
    if (error instanceof ChallengeError) {
        return res.status(error.status).json({ error: error.message });
    }

    if (String(error.code || "").startsWith("SQLITE_CONSTRAINT")) {
        return res.status(409).json({
            error: "Your official challenge for today has already been submitted."
        });
    }

    throw error;
}

export function startChallenge(req, res) {
    const body = req.body || {};
    const keys = Object.keys(body);

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        keys.some(key => key !== "official") ||
        (body.official !== undefined && typeof body.official !== "boolean")
    ) {
        return res.status(400).json({ error: "Invalid challenge request." });
    }

    try {
        const attempt = createChallenge(req.user, body.official !== false);
        return res.status(201).json(attempt);
    } catch (error) {
        return sendChallengeError(error, res);
    }
}

export function submitChallenge(req, res) {
    const body = req.body || {};
    const keys = Object.keys(body);

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        keys.length !== 2 ||
        !keys.includes("attempt_id") ||
        !keys.includes("answers") ||
        typeof body.attempt_id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.attempt_id)
    ) {
        return res.status(400).json({ error: "Invalid challenge submission." });
    }

    try {
        const result = submitChallengeAttempt(
            req.user,
            body.attempt_id,
            body.answers
        );
        return res.status(201).json(result);
    } catch (error) {
        return sendChallengeError(error, res);
    }
}

export function getChallengeStatus(req, res) {
    return res.json(readChallengeStatus(req.user.id));
}

export function deleteChallengeHistory(req, res) {
    const body = req.body;

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).length !== 1 ||
        body.confirm !== true
    ) {
        return res.status(400).json({
            error: "Explicit confirmation is required to delete challenge history."
        });
    }

    const currentDay = getOfficialChallengeDateKeys(now()).day;
    const clearHistory = db.transaction(() => {
        db.prepare(`
            INSERT OR IGNORE INTO challenge_daily_claims(
                user_id, day_key, claimed_at
            )
            SELECT user_id, day_key, MIN(created_at)
            FROM challenge_attempts
            WHERE user_id = ? AND official = 1 AND day_key = ?
            GROUP BY user_id, day_key
        `).run(req.user.id, currentDay);

        const attempts = db.prepare(`
            DELETE FROM challenge_attempts
            WHERE user_id = ?
        `).run(req.user.id);
        const challengeStats = db.prepare(`
            DELETE FROM records
            WHERE user_id = ? AND kind = 'achievement' AND id = 'challenge_stats'
        `).run(req.user.id);
        const sessions = db.prepare(`
            DELETE FROM challenge_sessions
            WHERE user_id = ?
        `).run(req.user.id);
        db.prepare(`
            DELETE FROM notifications
            WHERE user_id = ? AND type = 'challenge'
        `).run(req.user.id);
        db.prepare(`
            DELETE FROM challenge_daily_claims
            WHERE user_id = ? AND day_key <> ?
        `).run(req.user.id, currentDay);

        return {
            deleted_attempts: attempts.changes,
            deleted_attempts_in_progress: sessions.changes,
            deleted_challenge_stats: challengeStats.changes
        };
    });

    res.set("Cache-Control", "no-store");
    return res.json(clearHistory.immediate());
}

export function getLeaderboard(req, res) {
    const period = String(req.query.period || "daily");
    const band = String(req.query.band || "all");

    const col = {
        daily: "day_key",
        weekly: "week_key",
        monthly: "month_key"
    }[period];

    if (!col) {
        return res.status(400).json({
            error: "Invalid leaderboard period."
        });
    }

    if (!["all", "7-8", "9-10", "11-12"].includes(band)) {
        return res.status(400).json({ error: "Invalid leaderboard class group." });
    }

    const dateKeys = getOfficialChallengeDateKeys(now());
    const hasKey = Object.hasOwn(req.query, "key");
    const keys = period === "weekly" && !hasKey
        ? [dateKeys.week, dateKeys.legacyWeek]
        : [
            hasKey
                ? String(req.query.key)
                : dateKeys[period === "daily" ? "day" : period === "weekly" ? "week" : "month"]
        ];

    const sql = `
        SELECT
            u.username,
            u.standard,
            u.photo,
            SUM(a.score) score,
            SUM(a.correct) correct,
            SUM(a.total) total,
            MIN(a.elapsed) elapsed
        FROM challenge_attempts a
        JOIN users u ON u.id = a.user_id
        WHERE a.${col} IN (${keys.map(() => "?").join(", ")})
        AND a.official = 1
        ${band !== "all" ? "AND a.band = ?" : ""}
        GROUP BY a.user_id
        ORDER BY score DESC, correct DESC, elapsed ASC
        LIMIT 100
    `;

    const entries = band === "all"
        ? db.prepare(sql).all(...keys)
        : db.prepare(sql).all(...keys, band);

    res.json({
        entries,
        username: req.user.username
    });
}
