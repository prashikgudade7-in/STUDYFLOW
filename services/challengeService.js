import crypto from "node:crypto";
import db from "../config/database.js";
import { now } from "../utils/authUtils.js";
import { createNotificationFromEvent } from "./notificationService.js";

export const CHALLENGE_DURATION_SECONDS = 120;
export const CHALLENGE_ATTEMPT_TTL_SECONDS = 180;
export const CHALLENGE_QUESTION_COUNT = 15;
export const CHALLENGE_TIME_ZONE = "Asia/Kolkata";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CHALLENGE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
});

const questionBank = {
    "7-8": [
        ["happy", "Choose a synonym for HAPPY.", ["Sad", "Glad", "Angry", "Tired"], 1],
        ["begin", "Choose a synonym for BEGIN.", ["Start", "Finish", "Stop", "Wait"], 0],
        ["brave", "What does BRAVE mean?", ["Afraid", "Courageous", "Sleepy", "Careless"], 1],
        ["ancient", "Choose the opposite of ANCIENT.", ["Old", "Historic", "Modern", "Early"], 2],
        ["tiny", "Choose a synonym for TINY.", ["Huge", "Small", "Wide", "Tall"], 1],
        ["silent", "Choose the opposite of SILENT.", ["Quiet", "Still", "Noisy", "Calm"], 2],
        ["honest", "What does HONEST mean?", ["Truthful", "Lazy", "Funny", "Unkind"], 0],
        ["rapid", "Choose a synonym for RAPID.", ["Slow", "Fast", "Late", "Weak"], 1],
        ["polite", "Choose the opposite of POLITE.", ["Kind", "Rude", "Gentle", "Helpful"], 1],
        ["bright", "What does BRIGHT mean?", ["Full of light", "Very heavy", "Very slow", "Unhappy"], 0],
        ["difficult", "Choose a synonym for DIFFICULT.", ["Easy", "Simple", "Hard", "Clear"], 2],
        ["accept", "Choose the opposite of ACCEPT.", ["Receive", "Agree", "Reject", "Allow"], 2],
        ["protect", "What does PROTECT mean?", ["Keep safe", "Forget", "Damage", "Ignore"], 0],
        ["wealthy", "Choose a synonym for WEALTHY.", ["Poor", "Rich", "Weak", "Young"], 1],
        ["arrive", "Choose the opposite of ARRIVE.", ["Reach", "Come", "Depart", "Enter"], 2],
        ["curious", "What does CURIOUS mean?", ["Eager to know", "Very tired", "Unkind", "Afraid"], 0],
        ["purchase", "Choose a synonym for PURCHASE.", ["Sell", "Buy", "Borrow", "Lose"], 1],
        ["generous", "Choose the opposite of GENEROUS.", ["Kind", "Giving", "Selfish", "Helpful"], 2],
        ["repair", "What does REPAIR mean?", ["Break", "Fix", "Hide", "Move"], 1],
        ["vacant", "Choose a synonym for VACANT.", ["Occupied", "Empty", "Crowded", "Busy"], 1]
    ],
    "9-10": [
        ["reluctant", "Choose a synonym for RELUCTANT.", ["Eager", "Unwilling", "Certain", "Cheerful"], 1],
        ["scarce", "Choose the opposite of SCARCE.", ["Rare", "Limited", "Abundant", "Insufficient"], 2],
        ["concise", "What does CONCISE mean?", ["Using few words", "Very confusing", "Extremely loud", "Highly emotional"], 0],
        ["diligent", "Choose a synonym for DILIGENT.", ["Careless", "Hardworking", "Uncertain", "Impatient"], 1],
        ["hostile", "Choose the opposite of HOSTILE.", ["Unfriendly", "Aggressive", "Friendly", "Angry"], 2],
        ["inevitable", "What does INEVITABLE mean?", ["Impossible to avoid", "Easy to change", "Rarely seen", "Hard to explain"], 0],
        ["plausible", "Choose a synonym for PLAUSIBLE.", ["Unbelievable", "Reasonable", "Impossible", "Unclear"], 1],
        ["fragile", "Choose the opposite of FRAGILE.", ["Delicate", "Breakable", "Sturdy", "Weak"], 2],
        ["ambiguous", "What does AMBIGUOUS mean?", ["Having more than one possible meaning", "Very simple", "Completely false", "Easy to prove"], 0],
        ["obscure", "Choose a synonym for OBSCURE.", ["Famous", "Unclear", "Bright", "Obvious"], 1],
        ["optimistic", "Choose the opposite of OPTIMISTIC.", ["Hopeful", "Positive", "Pessimistic", "Confident"], 2],
        ["adapt", "What does ADAPT mean?", ["Adjust to new conditions", "Refuse to change", "Make a mistake", "Move away"], 0],
        ["notorious", "Choose a synonym for NOTORIOUS.", ["Respected", "Infamous", "Unknown", "Generous"], 1],
        ["expand", "Choose the opposite of EXPAND.", ["Increase", "Extend", "Contract", "Develop"], 2],
        ["contemplate", "What does CONTEMPLATE mean?", ["Think deeply", "Speak loudly", "Act quickly", "Forget easily"], 0],
        ["vital", "Choose a synonym for VITAL.", ["Unimportant", "Essential", "Optional", "Ordinary"], 1],
        ["temporary", "Choose the opposite of TEMPORARY.", ["Brief", "Short-lived", "Permanent", "Limited"], 2],
        ["elaborate", "What does ELABORATE mean?", ["Detailed", "Simple", "Hidden", "Uncertain"], 0],
        ["abstain", "Choose a synonym for ABSTAIN.", ["Participate", "Refrain", "Insist", "Continue"], 1],
        ["generous", "Choose the opposite of GENEROUS.", ["Kind", "Giving", "Stingy", "Helpful"], 2]
    ],
    "11-12": [
        ["pragmatic", "What does PRAGMATIC mean?", ["Idealistic", "Practical and realistic", "Careless", "Uncertain"], 1],
        ["ephemeral", "Choose a synonym for EPHEMERAL.", ["Permanent", "Short-lived", "Endless", "Ancient"], 1],
        ["ubiquitous", "What does UBIQUITOUS mean?", ["Present everywhere", "Very rare", "Difficult to measure", "Highly valuable"], 0],
        ["mitigate", "Choose a synonym for MITIGATE.", ["Intensify", "Alleviate", "Ignore", "Predict"], 1],
        ["benevolent", "Choose the opposite of BENEVOLENT.", ["Kind", "Charitable", "Malevolent", "Generous"], 2],
        ["scrutinise", "What does SCRUTINISE mean?", ["Examine closely", "Ignore deliberately", "Summarise briefly", "Approve quickly"], 0],
        ["ambivalent", "Choose the closest meaning of AMBIVALENT.", ["Having mixed feelings", "Completely certain", "Strongly opposed", "Very enthusiastic"], 0],
        ["conspicuous", "Choose the opposite of CONSPICUOUS.", ["Noticeable", "Obvious", "Inconspicuous", "Prominent"], 2],
        ["prudent", "What does PRUDENT mean?", ["Showing good judgement", "Reckless", "Excessively proud", "Uninformed"], 0],
        ["detrimental", "Choose a synonym for DETRIMENTAL.", ["Beneficial", "Harmful", "Neutral", "Unrelated"], 1],
        ["resilient", "Choose the closest meaning of RESILIENT.", ["Able to recover quickly", "Unable to change", "Easily damaged", "Extremely cautious"], 0],
        ["equivocal", "What does EQUIVOCAL mean?", ["Unambiguous", "Open to more than one interpretation", "Completely accurate", "Unnecessarily brief"], 1],
        ["meticulous", "Choose a synonym for METICULOUS.", ["Thorough", "Hasty", "Casual", "Negligent"], 0],
        ["obsolete", "Choose the opposite of OBSOLETE.", ["Outdated", "Deprecated", "Current", "Ancient"], 2],
        ["ameliorate", "What does AMELIORATE mean?", ["Make worse", "Improve", "Postpone", "Question"], 1],
        ["candid", "Choose the closest meaning of CANDID.", ["Frank and truthful", "Secretive", "Overly formal", "Uncertain"], 0],
        ["ostensible", "What does OSTENSIBLE mean?", ["Appearing to be true, but possibly not", "Completely hidden", "Scientifically proven", "Impossible"], 0],
        ["disparate", "Choose a synonym for DISPARATE.", ["Similar", "Different", "Identical", "Related"], 1],
        ["exacerbate", "What does EXACERBATE mean?", ["Make more severe", "Make simpler", "Resolve fully", "Explain clearly"], 0],
        ["austere", "Choose the closest meaning of AUSTERE.", ["Plain or strict", "Luxurious", "Colourful", "Carefree"], 0]
    ]
};

export class ChallengeError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function classBand(standard) {
    const grade = Number(standard);

    if (grade >= 7 && grade <= 8) return "7-8";
    if (grade >= 9 && grade <= 10) return "9-10";
    if (grade >= 11 && grade <= 12) return "11-12";

    throw new ChallengeError(400, "The account has an unsupported class.");
}

export function getOfficialChallengeDateKeys(timestamp = now()) {
    const date = new Date(timestamp * 1000);
    const parts = Object.fromEntries(
        dateFormatter.formatToParts(date)
            .filter(part => part.type !== "literal")
            .map(part => [part.type, part.value])
    );
    const year = Number(parts.year);
    const month = Number(parts.month);
    const day = Number(parts.day);
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    const weekStartDate = new Date(utcDate);
    const isoDay = utcDate.getUTCDay() || 7;

    weekStartDate.setUTCDate(
        weekStartDate.getUTCDate() - ((weekStartDate.getUTCDay() + 6) % 7)
    );
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - isoDay);
    const isoYear = utcDate.getUTCFullYear();
    const yearStart = Date.UTC(isoYear, 0, 1);
    const week = Math.ceil(((utcDate.getTime() - yearStart) / 86400000 + 1) / 7);
    const legacyWeek = [
        weekStartDate.getUTCFullYear(),
        String(weekStartDate.getUTCMonth() + 1).padStart(2, "0"),
        String(weekStartDate.getUTCDate()).padStart(2, "0")
    ].join("-");

    return {
        day: `${parts.year}-${parts.month}-${parts.day}`,
        week: `${isoYear}-W${String(week).padStart(2, "0")}`,
        month: `${parts.year}-${parts.month}`,
        legacyWeek
    };
}

function shuffledQuestions(band) {
    const source = questionBank[band].slice();

    for (let index = source.length - 1; index > 0; index -= 1) {
        const other = crypto.randomInt(index + 1);
        [source[index], source[other]] = [source[other], source[index]];
    }

    return source.slice(0, CHALLENGE_QUESTION_COUNT).map(
        ([, prompt, options, correctIndex]) => ({
            prompt,
            options,
            correctIndex
        })
    );
}

function publicAttempt(attempt, timestamp) {
    const questions = JSON.parse(attempt.questions_json);
    const elapsed = Math.max(0, timestamp - attempt.created_at);

    return {
        attempt_id: attempt.attempt_id,
        official: Boolean(attempt.official),
        duration_seconds: CHALLENGE_DURATION_SECONDS,
        remaining_seconds: Math.max(0, CHALLENGE_DURATION_SECONDS - elapsed),
        questions: questions.map(({ prompt, options }) => ({ prompt, options }))
    };
}

export function startChallenge(user, official = true, timestamp = now()) {
    const band = classBand(user.standard);
    const dates = getOfficialChallengeDateKeys(timestamp);
    const questions = shuffledQuestions(band);
    const attempt = {
        attempt_id: crypto.randomUUID(),
        user_id: user.id,
        band,
        ...{
            day_key: dates.day,
            week_key: dates.week,
            month_key: dates.month
        },
        questions_json: JSON.stringify(questions),
        official: official ? 1 : 0,
        created_at: timestamp,
        expires_at: timestamp + CHALLENGE_ATTEMPT_TTL_SECONDS,
        status: "pending"
    };

    const createAttempt = db.transaction(() => {
        db.prepare(`
            UPDATE challenge_sessions
            SET status = 'expired'
            WHERE user_id = ?
            AND status = 'pending'
            AND (expires_at <= ? OR day_key <> ?)
        `).run(user.id, timestamp, dates.day);

        const hasDailyClaim = official && (
            db.prepare(`
                SELECT 1
                FROM challenge_daily_claims
                WHERE user_id = ? AND day_key = ?
            `).get(user.id, dates.day) ||
            db.prepare(`
                SELECT 1
                FROM challenge_attempts
                WHERE user_id = ? AND day_key = ? AND official = 1
            `).get(user.id, dates.day)
        );

        if (hasDailyClaim) {
            return { error: new ChallengeError(409, "Your official challenge for today has already been submitted.") };
        }

        const current = db.prepare(`
            SELECT *
            FROM challenge_sessions
            WHERE user_id = ? AND status = 'pending'
        `).get(user.id);

        if (current) {
            if (Boolean(current.official) !== Boolean(attempt.official)) {
                return { error: new ChallengeError(409, "Another challenge attempt is already in progress.") };
            }

            return { attempt: publicAttempt(current, timestamp) };
        }

        db.prepare(`
            INSERT INTO challenge_sessions(
                attempt_id, user_id, band, day_key, week_key, month_key,
                questions_json, official, created_at, expires_at, status
            )
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            attempt.attempt_id,
            attempt.user_id,
            attempt.band,
            attempt.day_key,
            attempt.week_key,
            attempt.month_key,
            attempt.questions_json,
            attempt.official,
            attempt.created_at,
            attempt.expires_at,
            attempt.status
        );

        return { attempt: publicAttempt(attempt, timestamp) };
    });

    const result = createAttempt.immediate();
    if (result.error) throw result.error;
    return result.attempt;
}

export function getChallengeStatus(userId, timestamp = now()) {
    const dates = getOfficialChallengeDateKeys(timestamp);

    db.prepare(`
        UPDATE challenge_sessions
        SET status = 'expired'
        WHERE user_id = ?
        AND status = 'pending'
        AND (expires_at <= ? OR day_key <> ?)
    `).run(userId, timestamp, dates.day);

    const result = db.prepare(`
        SELECT score, correct, total, elapsed
        FROM challenge_attempts
        WHERE user_id = ? AND day_key = ? AND official = 1
    `).get(userId, dates.day);
    const dailyClaim = db.prepare(`
        SELECT 1
        FROM challenge_daily_claims
        WHERE user_id = ? AND day_key = ?
    `).get(userId, dates.day);

    const pending = db.prepare(`
        SELECT *
        FROM challenge_sessions
        WHERE user_id = ? AND status = 'pending'
    `).get(userId);

    return {
        completed: Boolean(result || dailyClaim),
        result: result || null,
        attempt: pending ? publicAttempt(pending, timestamp) : null
    };
}

export function submitChallengeAttempt(user, attemptId, answers, timestamp = now()) {
    const submit = db.transaction(() => {
        const attempt = db.prepare(`
            SELECT *
            FROM challenge_sessions
            WHERE attempt_id = ? AND user_id = ?
        `).get(attemptId, user.id);

        if (!attempt) {
            return { error: new ChallengeError(404, "Challenge attempt not found.") };
        }

        if (attempt.status !== "pending") {
            return { error: new ChallengeError(409, "This challenge attempt has already been used.") };
        }

        if (attempt.expires_at <= timestamp) {
            db.prepare(`
                UPDATE challenge_sessions
                SET status = 'expired'
                WHERE attempt_id = ? AND user_id = ? AND status = 'pending'
            `).run(attemptId, user.id);

            return { error: new ChallengeError(410, "This challenge attempt has expired.") };
        }

        const submissionDates = getOfficialChallengeDateKeys(timestamp);
        if (attempt.day_key !== submissionDates.day) {
            db.prepare(`
                UPDATE challenge_sessions
                SET status = 'expired'
                WHERE attempt_id = ? AND user_id = ? AND status = 'pending'
            `).run(attemptId, user.id);

            return { error: new ChallengeError(410, "This challenge attempt expired at the IST daily reset.") };
        }

        const questions = JSON.parse(attempt.questions_json);

        if (
            !Array.isArray(answers) ||
            answers.length !== questions.length ||
            answers.some((answer, index) => (
                answer !== null &&
                (!Number.isInteger(answer) || answer < 0 || answer >= questions[index].options.length)
            ))
        ) {
            return { error: new ChallengeError(400, "Submit one valid answer selection for each question.") };
        }

        let currentBand;
        try {
            currentBand = classBand(user.standard);
        } catch (error) {
            return { error };
        }

        if (currentBand !== attempt.band) {
            db.prepare(`
                UPDATE challenge_sessions
                SET status = 'expired'
                WHERE attempt_id = ? AND user_id = ? AND status = 'pending'
            `).run(attemptId, user.id);

            return { error: new ChallengeError(409, "Your class changed during this attempt. Start a new challenge.") };
        }

        const claimed = db.prepare(`
            UPDATE challenge_sessions
            SET status = 'consumed', submitted_at = ?
            WHERE attempt_id = ? AND user_id = ?
            AND status = 'pending' AND expires_at > ?
        `).run(timestamp, attemptId, user.id, timestamp);

        if (claimed.changes !== 1) {
            return { error: new ChallengeError(409, "This challenge attempt is no longer available.") };
        }

        const correct = answers.reduce(
            (count, answer, index) =>
                count + Number(answer !== null && answer === questions[index].correctIndex),
            0
        );
        const elapsed = Math.max(
            1,
            Math.min(CHALLENGE_DURATION_SECONDS, timestamp - attempt.created_at)
        );

        if (attempt.official) {
            db.prepare(`
                INSERT INTO challenge_daily_claims(user_id, day_key, claimed_at)
                VALUES(?, ?, ?)
            `).run(user.id, submissionDates.day, timestamp);

            db.prepare(`
                INSERT INTO challenge_attempts(
                    user_id, band, day_key, week_key, month_key,
                    score, correct, total, elapsed, official, created_at
                )
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            `).run(
                user.id,
                currentBand,
                submissionDates.day,
                submissionDates.week,
                submissionDates.month,
                correct,
                correct,
                questions.length,
                elapsed,
                timestamp
            );

            createNotificationFromEvent({
                userId: user.id,
                eventKey: `challenge:${attemptId}`,
                type: "challenge",
                title: "Your challenge result is ready",
                message: `You scored ${correct} out of ${questions.length} in today's challenge.`,
                actionUrl: "/#challenge",
                createdAt: timestamp
            });
        }

        return {
            result: {
                ok: true,
                official: Boolean(attempt.official),
                score: correct,
                correct,
                total: questions.length,
                elapsed
            }
        };
    });

    const result = submit.immediate();
    if (result.error) throw result.error;
    return result.result;
}

export function cleanupExpiredChallengeData(timestamp = now()) {
    const currentDay = getOfficialChallengeDateKeys(timestamp).day;
    const cleanup = db.transaction(() => {
        const sessions = db.prepare(`
            DELETE FROM challenge_sessions
            WHERE expires_at <= ?
        `).run(timestamp);
        const claims = db.prepare(`
            DELETE FROM challenge_daily_claims
            WHERE day_key <> ?
        `).run(currentDay);

        return {
            sessions: sessions.changes,
            claims: claims.changes
        };
    });

    return cleanup.immediate();
}
