import assert from "node:assert/strict";
import crypto from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import cookieParser from "cookie-parser";
import express from "express";
import test from "node:test";

const tempDir = mkdtempSync(path.join(os.tmpdir(), "studyflow-challenge-tests-"));
process.env.STUDYFLOW_DB_PATH = path.join(tempDir, "challenge-test.sqlite");
process.env.NODE_ENV = "test";

const { default: db, closeDatabase } = await import("../config/database.js");
const { hashToken } = await import("../utils/authUtils.js");
const {
    ChallengeError,
    getOfficialChallengeDateKeys,
    startChallenge,
    submitChallengeAttempt
} = await import("../services/challengeService.js");
const {
    startChallenge: startChallengeController,
    submitChallenge: submitChallengeController,
    getChallengeStatus: getChallengeStatusController,
    getLeaderboard
} = await import("../controllers/challengeController.js");
const challengeRoutes = (await import("../routes/challengeRoutes.js")).default;

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use("/api", challengeRoutes);

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

let userSequence = 0;

function createUser(standard = "9") {
    userSequence += 1;
    const userId = db.prepare(`
        INSERT INTO users(
            full_name, username, email, password_hash, password_salt,
            standard, board, created_at
        )
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        `Challenge Student ${userSequence}`,
        `challenge_student_${userSequence}`,
        `challenge${userSequence}@example.test`,
        "test-hash",
        "0".repeat(32),
        standard,
        "CBSE",
        Math.floor(Date.now() / 1000)
    ).lastInsertRowid;
    const token = crypto.randomBytes(32).toString("base64url");

    db.prepare(`
        INSERT INTO sessions(token_hash, user_id, expires_at)
        VALUES(?, ?, ?)
    `).run(hashToken(token), userId, Math.floor(Date.now() / 1000) + 3600);

    return {
        id: Number(userId),
        standard,
        username: `challenge_student_${userSequence}`,
        token
    };
}

function controllerResponse() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

function invokeController(controller, user, body, query = {}) {
    const res = controllerResponse();
    controller({ user, body, query }, res);
    return res;
}

async function request(pathname, { token, body } = {}) {
    const headers = {};
    if (token) headers.cookie = `studyflow_session=${token}`;
    if (body !== undefined) headers["content-type"] = "application/json";

    const response = await fetch(`${baseUrl}${pathname}`, {
        method: body === undefined ? "GET" : "POST",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    return {
        status: response.status,
        body: await response.json()
    };
}

function storedAnswers(attemptId) {
    const row = db.prepare(`
        SELECT questions_json
        FROM challenge_sessions
        WHERE attempt_id = ?
    `).get(attemptId);
    return JSON.parse(row.questions_json).map(question => question.correctIndex);
}

function attemptCount(userId) {
    return db.prepare(`
        SELECT COUNT(*) AS count
        FROM challenge_sessions
        WHERE user_id = ?
    `).get(userId).count;
}

test("challenge routes require an authenticated session", async () => {
    const start = await request("/challenge/start", {
        body: { official: true }
    });
    const submit = await request("/challenge", {
        body: { attempt_id: crypto.randomUUID(), answers: [] }
    });

    assert.equal(start.status, 401);
    assert.equal(submit.status, 401);
});

test("challenge generation returns questions without answer keys and persists ownership", async () => {
    const user = createUser();
    const response = await request("/challenge/start", {
        token: user.token,
        body: { official: true }
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.questions.length, 15);
    assert.equal(response.body.official, true);
    assert.equal(response.body.duration_seconds, 120);
    assert.ok(response.body.attempt_id);
    for (const question of response.body.questions) {
        assert.deepEqual(Object.keys(question).sort(), ["options", "prompt"]);
        assert.equal(question.options.length, 4);
    }

    const persisted = db.prepare(`
        SELECT user_id, status, questions_json
        FROM challenge_sessions
        WHERE attempt_id = ?
    `).get(response.body.attempt_id);
    assert.equal(persisted.user_id, user.id);
    assert.equal(persisted.status, "pending");
    assert.ok(JSON.parse(persisted.questions_json).every(
        question => Number.isInteger(question.correctIndex)
    ));
    assert.equal(JSON.stringify(response.body).includes("correctIndex"), false);
});

test("server scores correct answers and derives band and IST period keys", () => {
    const user = createUser("7");
    const startedAt = Date.UTC(2025, 0, 1, 18, 29, 0) / 1000;
    const attempt = startChallenge(user, true, startedAt);
    const result = submitChallengeAttempt(
        user,
        attempt.attempt_id,
        storedAnswers(attempt.attempt_id),
        startedAt + 30
    );
    const saved = db.prepare(`
        SELECT band, day_key, week_key, month_key, score, correct, total, elapsed
        FROM challenge_attempts
        WHERE user_id = ?
    `).get(user.id);

    assert.deepEqual(result, {
        ok: true,
        official: true,
        score: 15,
        correct: 15,
        total: 15,
        elapsed: 30
    });
    assert.deepEqual(saved, {
        band: "7-8",
        day_key: "2025-01-01",
        week_key: "2025-W01",
        month_key: "2025-01",
        score: 15,
        correct: 15,
        total: 15,
        elapsed: 30
    });
});

test("server scores incorrect and skipped answers from the persisted question set", () => {
    const user = createUser();
    const startedAt = 1_735_740_000;
    const attempt = startChallenge(user, true, startedAt);
    const correctAnswers = storedAnswers(attempt.attempt_id);
    const answers = correctAnswers.map((answer, index) => (
        index === 0 ? null : (answer + 1) % 4
    ));
    const expected = answers.reduce(
        (score, answer, index) =>
            score + Number(answer !== null && answer === correctAnswers[index]),
        0
    );
    const result = submitChallengeAttempt(user, attempt.attempt_id, answers, startedAt + 20);

    assert.equal(result.score, expected);
    assert.equal(result.correct, expected);
    assert.equal(result.total, 15);
});

test("legacy score submissions and client-controlled date or band fields are rejected", () => {
    const user = createUser();
    const legacy = invokeController(startChallengeController, user, {
        score: 15,
        correct: 15,
        total: 15,
        elapsed: 1,
        band: "9-10",
        day_key: "2099-12-31",
        week_key: "2099-W52",
        month_key: "2099-12",
        official: true
    });
    assert.equal(legacy.statusCode, 400);

    const attempt = startChallenge(user, true);
    const manipulated = invokeController(submitChallengeController, user, {
        attempt_id: attempt.attempt_id,
        answers: storedAnswers(attempt.attempt_id),
        score: 15,
        day_key: "2099-12-31",
        band: "11-12"
    });

    assert.equal(manipulated.statusCode, 400);
    assert.equal(attemptCount(user.id), 1);
    assert.equal(db.prepare(
        "SELECT COUNT(*) AS count FROM challenge_attempts WHERE user_id = ?"
    ).get(user.id).count, 0);
});

test("attempts are bound to their owner and class band", () => {
    const owner = createUser("7");
    const otherUser = createUser("11");
    const attempt = startChallenge(owner, true);
    const answers = storedAnswers(attempt.attempt_id);

    assert.throws(
        () => submitChallengeAttempt(otherUser, attempt.attempt_id, answers),
        error => error instanceof ChallengeError && error.status === 404
    );

    const result = submitChallengeAttempt(owner, attempt.attempt_id, answers);
    const saved = db.prepare(
        "SELECT band FROM challenge_attempts WHERE user_id = ?"
    ).get(owner.id);
    assert.equal(result.score, 15);
    assert.equal(saved.band, "7-8");
});

test("expired attempts cannot be submitted and are marked expired", () => {
    const user = createUser();
    const startedAt = 1_735_740_000;
    const attempt = startChallenge(user, true, startedAt);
    let caught;
    try {
        submitChallengeAttempt(
            user,
            attempt.attempt_id,
            storedAnswers(attempt.attempt_id),
            startedAt + 180
        );
    } catch (error) {
        caught = error;
    }

    assert.ok(caught instanceof ChallengeError);
    assert.equal(caught.status, 410);
    assert.equal(db.prepare(
        "SELECT status FROM challenge_sessions WHERE attempt_id = ?"
    ).get(attempt.attempt_id).status, "expired");
});

test("attempts cannot be replayed and one user cannot create concurrent attempts", () => {
    const user = createUser();
    const first = startChallenge(user, true);
    const repeatedStart = startChallenge(user, true);
    assert.equal(repeatedStart.attempt_id, first.attempt_id);
    assert.equal(attemptCount(user.id), 1);

    const answers = storedAnswers(first.attempt_id);
    submitChallengeAttempt(user, first.attempt_id, answers);
    assert.throws(
        () => submitChallengeAttempt(user, first.attempt_id, answers),
        error => error instanceof ChallengeError && error.status === 409
    );
});

test("daily official submissions are restricted even when the browser requests another attempt", () => {
    const user = createUser();
    const startedAt = Date.UTC(2025, 0, 1, 18, 30, 0) / 1000;
    const attempt = startChallenge(user, true, startedAt);
    submitChallengeAttempt(
        user,
        attempt.attempt_id,
        storedAnswers(attempt.attempt_id),
        startedAt + 15
    );

    assert.throws(
        () => startChallenge(user, true, startedAt + 30),
        error => error instanceof ChallengeError && error.status === 409
    );
});

test("an attempt cannot be submitted after the IST daily reset", () => {
    const user = createUser();
    const startedAt = Date.parse("2025-01-01T18:29:30Z") / 1000;
    const attempt = startChallenge(user, true, startedAt);

    assert.throws(
        () => submitChallengeAttempt(
            user,
            attempt.attempt_id,
            storedAnswers(attempt.attempt_id),
            startedAt + 30
        ),
        error => error instanceof ChallengeError && error.status === 410
    );
    assert.equal(db.prepare(
        "SELECT COUNT(*) AS count FROM challenge_attempts WHERE user_id = ?"
    ).get(user.id).count, 0);
});

test("concurrent submissions consume an attempt and write its result only once", async () => {
    const user = createUser();
    const attempt = startChallenge(user, true);
    const answers = storedAnswers(attempt.attempt_id);
    const responses = await Promise.all([
        request("/challenge", { token: user.token, body: { attempt_id: attempt.attempt_id, answers } }),
        request("/challenge", { token: user.token, body: { attempt_id: attempt.attempt_id, answers } })
    ]);

    assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
    assert.equal(db.prepare(
        "SELECT COUNT(*) AS count FROM challenge_attempts WHERE user_id = ?"
    ).get(user.id).count, 1);
});

test("IST daily reset, Monday week boundary, and month/year rollover are deterministic", () => {
    const beforeMidnight = Date.parse("2025-01-01T18:29:59Z") / 1000;
    const atMidnight = beforeMidnight + 1;
    assert.deepEqual(getOfficialChallengeDateKeys(beforeMidnight), {
        day: "2025-01-01",
        week: "2025-W01",
        month: "2025-01",
        legacyWeek: "2024-12-30"
    });
    assert.deepEqual(getOfficialChallengeDateKeys(atMidnight), {
        day: "2025-01-02",
        week: "2025-W01",
        month: "2025-01",
        legacyWeek: "2024-12-30"
    });

    const sundayLastSecond = Date.parse("2025-01-05T18:29:59Z") / 1000;
    assert.equal(getOfficialChallengeDateKeys(sundayLastSecond).week, "2025-W01");
    assert.equal(getOfficialChallengeDateKeys(sundayLastSecond + 1).week, "2025-W02");

    const yearBoundary = Date.parse("2024-12-31T18:29:59Z") / 1000;
    assert.deepEqual(getOfficialChallengeDateKeys(yearBoundary), {
        day: "2024-12-31",
        week: "2025-W01",
        month: "2024-12",
        legacyWeek: "2024-12-30"
    });
    assert.deepEqual(getOfficialChallengeDateKeys(yearBoundary + 1), {
        day: "2025-01-01",
        week: "2025-W01",
        month: "2025-01",
        legacyWeek: "2024-12-30"
    });
    assert.equal(
        getOfficialChallengeDateKeys(Date.parse("2021-01-04T00:00:00Z") / 1000).week,
        "2021-W01"
    );
});

test("status ignores browser-selected dates and defaults leaderboards to current server dates", () => {
    const user = createUser();
    const timestamp = Date.UTC(2025, 5, 1, 18, 30, 0) / 1000;
    const attempt = startChallenge(user, true, timestamp);
    submitChallengeAttempt(
        user,
        attempt.attempt_id,
        storedAnswers(attempt.attempt_id),
        timestamp + 10
    );

    const originalNow = Date.now;
    Date.now = () => timestamp * 1000;
    try {
        const statusResponse = controllerResponse();
        getChallengeStatusController({
            user,
            query: { day: "2099-12-31" }
        }, statusResponse);
        assert.equal(statusResponse.body.completed, true);
        assert.deepEqual(statusResponse.body.result, {
            score: 15,
            correct: 15,
            total: 15,
            elapsed: 10
        });

        const leaderboardResponse = controllerResponse();
        getLeaderboard({
            user,
            query: { period: "daily", band: "all" }
        }, leaderboardResponse);
        assert.equal(leaderboardResponse.body.entries.length, 1);
        assert.equal(leaderboardResponse.body.entries[0].score, 15);
    } finally {
        Date.now = originalNow;
    }
});

test("historical leaderboard keys remain queryable", () => {
    const user = createUser();
    db.prepare(`
        INSERT INTO challenge_attempts(
            user_id, band, day_key, week_key, month_key,
            score, correct, total, elapsed, official, created_at
        )
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(user.id, "9-10", "2024-12-30", "2024-12-30", "2024-12", 8, 8, 15, 70, 1);

    const response = controllerResponse();
    getLeaderboard({
        user,
        query: { period: "weekly", band: "all", key: "2024-12-30" }
    }, response);

    assert.equal(response.body.entries.length, 1);
    assert.equal(response.body.entries[0].score, 8);
});

test("the current weekly leaderboard includes legacy week-start keys", () => {
    const user = createUser();
    const timestamp = Date.parse("2025-01-08T06:00:00Z") / 1000;
    db.prepare(`
        INSERT INTO challenge_attempts(
            user_id, band, day_key, week_key, month_key,
            score, correct, total, elapsed, official, created_at
        )
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(user.id, "9-10", "2025-01-06", "2025-01-06", "2025-01", 4, 4, 15, 70, 1);
    db.prepare(`
        INSERT INTO challenge_attempts(
            user_id, band, day_key, week_key, month_key,
            score, correct, total, elapsed, official, created_at
        )
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(user.id, "9-10", "2025-01-08", "2025-W02", "2025-01", 6, 6, 15, 60, 2);

    const originalNow = Date.now;
    Date.now = () => timestamp * 1000;
    try {
        const response = controllerResponse();
        getLeaderboard({
            user,
            query: { period: "weekly", band: "all" }
        }, response);
        assert.equal(response.body.entries.length, 1);
        assert.equal(response.body.entries[0].score, 10);
    } finally {
        Date.now = originalNow;
    }
});

test.after(async () => {
    await new Promise(resolve => server.close(resolve));
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
});
