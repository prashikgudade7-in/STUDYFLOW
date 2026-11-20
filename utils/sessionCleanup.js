import { cleanupExpiredSessions } from "./authUtils.js";
import { cleanupExpiredLoginLimits } from "../middleware/loginIdentifierRateLimit.js";
import { cleanupExpiredChallengeData } from "../services/challengeService.js";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export function startSessionCleanup() {
    function cleanup() {
        try {
            const deleted = cleanupExpiredSessions();
            cleanupExpiredLoginLimits();
            cleanupExpiredChallengeData();

            if (deleted > 0) {
                console.log(`Removed ${deleted} expired session(s).`);
            }
        } catch (error) {
            console.error("Session cleanup failed:", error.message);
        }
    }

    // Clean expired sessions when the server starts.
    cleanup();

    // Repeat cleanup every hour.
    const timer = setInterval(cleanup, CLEANUP_INTERVAL_MS);

    // Allow Node.js to exit normally when needed.
    timer.unref();

    return timer;
}
