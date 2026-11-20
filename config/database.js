import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get the main project directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Connect to the existing SQLite database
const dbPath = process.env.STUDYFLOW_DB_PATH
    ? path.resolve(projectRoot, process.env.STUDYFLOW_DB_PATH)
    : path.join(projectRoot, "data", "studyflow.db");

mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// Database configuration
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create tables if they do not already exist
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    standard TEXT NOT NULL,
    board TEXT NOT NULL,
    school TEXT DEFAULT '',
    photo TEXT DEFAULT '',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS privacy_consents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK(purpose = 'core_service'),
    version TEXT NOT NULL CHECK(length(version) BETWEEN 1 AND 80),
    granted_at INTEGER NOT NULL,
    UNIQUE(user_id, purpose, version)
);

CREATE INDEX IF NOT EXISTS privacy_consents_user_granted
ON privacy_consents(user_id, granted_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_expiry
ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS records_user_kind
ON records(user_id, kind);

CREATE TABLE IF NOT EXISTS challenge_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    band TEXT NOT NULL,
    day_key TEXT NOT NULL,
    week_key TEXT NOT NULL,
    month_key TEXT NOT NULL,
    score INTEGER NOT NULL,
    correct INTEGER NOT NULL,
    total INTEGER NOT NULL,
    elapsed INTEGER NOT NULL,
    official INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS one_official_challenge_per_day
ON challenge_attempts(user_id, day_key)
WHERE official = 1;

CREATE TABLE IF NOT EXISTS challenge_daily_claims (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_key TEXT NOT NULL,
    claimed_at INTEGER NOT NULL,
    PRIMARY KEY(user_id, day_key)
);

CREATE INDEX IF NOT EXISTS challenge_daily_claims_day
ON challenge_daily_claims(day_key);

CREATE TABLE IF NOT EXISTS challenge_sessions (
    attempt_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    band TEXT NOT NULL,
    day_key TEXT NOT NULL,
    week_key TEXT NOT NULL,
    month_key TEXT NOT NULL,
    questions_json TEXT NOT NULL,
    official INTEGER NOT NULL CHECK (official IN (0, 1)),
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'consumed', 'expired')),
    submitted_at INTEGER
);

CREATE INDEX IF NOT EXISTS challenge_sessions_user_status_expiry
ON challenge_sessions(user_id, status, expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS one_pending_challenge_per_user
ON challenge_sessions(user_id)
WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS login_attempt_limits (
    identifier_hash TEXT PRIMARY KEY,
    window_started_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS login_attempt_limits_expiry
ON login_attempt_limits(expires_at);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_key TEXT NOT NULL CHECK(length(event_key) BETWEEN 1 AND 160),
    type TEXT NOT NULL CHECK(type IN (
        'study_reminder',
        'daily_goal',
        'challenge',
        'achievement',
        'system'
    )),
    title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
    message TEXT NOT NULL CHECK(length(message) BETWEEN 1 AND 500),
    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK(priority IN ('low', 'normal', 'high')),
    is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0, 1)),
    is_important INTEGER NOT NULL DEFAULT 0 CHECK(is_important IN (0, 1)),
    action_url TEXT CHECK(action_url IS NULL OR action_url IN (
        '/#home',
        '/#challenge',
        '/#leaderboard',
        '/#stats',
        '/#settings'
    )),
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, event_key)
);

CREATE INDEX IF NOT EXISTS notifications_user_created
ON notifications(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread
ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    study_reminders INTEGER NOT NULL DEFAULT 0
        CHECK(study_reminders IN (0, 1)),
    daily_goals INTEGER NOT NULL DEFAULT 0
        CHECK(daily_goals IN (0, 1)),
    challenge_updates INTEGER NOT NULL DEFAULT 0
        CHECK(challenge_updates IN (0, 1)),
    achievement_notifications INTEGER NOT NULL DEFAULT 0
        CHECK(achievement_notifications IN (0, 1)),
    system_announcements INTEGER NOT NULL DEFAULT 0
        CHECK(system_announcements IN (0, 1)),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
`);

db.exec(`
INSERT OR IGNORE INTO challenge_daily_claims(user_id, day_key, claimed_at)
SELECT user_id, day_key, MIN(created_at)
FROM challenge_attempts
WHERE official = 1
GROUP BY user_id, day_key;
`);

// Close the database connection safely
export function closeDatabase() {
    if (db.open) {
        db.close();
        console.log("SQLite database connection closed.");
    }
}

export default db;