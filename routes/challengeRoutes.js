import express from "express";

import {
    startChallenge,
    submitChallenge,
    getChallengeStatus,
    deleteChallengeHistory,
    getLeaderboard
} from "../controllers/challengeController.js";

import { auth } from "../middleware/authMiddleware.js";
import {
    challengeLimiter,
    challengeStartLimiter,
    challengeHistoryDeletionLimiter
} from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.post("/challenge/start", auth, challengeStartLimiter, startChallenge);
router.post("/challenge", auth, challengeLimiter, submitChallenge);
router.get("/challenge/status", auth, getChallengeStatus);
router.delete("/challenge/history", auth, challengeHistoryDeletionLimiter, deleteChallengeHistory);
router.get("/leaderboard", auth, getLeaderboard);

export default router;
