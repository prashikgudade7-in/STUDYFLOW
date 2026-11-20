import db from "../config/database.js";
import { now } from "../utils/authUtils.js";

export const CORE_SERVICE_CONSENT_PURPOSE = "core_service";
export const CORE_SERVICE_CONSENT_VERSION = "2026-11-19-v1";

export function recordCoreServiceConsent(userId, grantedAt = now()) {
    db.prepare(`
        INSERT OR IGNORE INTO privacy_consents(
            user_id, purpose, version, granted_at
        )
        VALUES(?, ?, ?, ?)
    `).run(
        userId,
        CORE_SERVICE_CONSENT_PURPOSE,
        CORE_SERVICE_CONSENT_VERSION,
        grantedAt
    );

    return db.prepare(`
        SELECT purpose, version, granted_at
        FROM privacy_consents
        WHERE user_id = ? AND purpose = ? AND version = ?
    `).get(
        userId,
        CORE_SERVICE_CONSENT_PURPOSE,
        CORE_SERVICE_CONSENT_VERSION
    ) || null;
}

export function getCoreServiceConsent(userId) {
    return db.prepare(`
        SELECT purpose, version, granted_at
        FROM privacy_consents
        WHERE user_id = ? AND purpose = ? AND version = ?
    `).get(
        userId,
        CORE_SERVICE_CONSENT_PURPOSE,
        CORE_SERVICE_CONSENT_VERSION
    ) || null;
}
