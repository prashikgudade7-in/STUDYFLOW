import express from "express";

import {
    generateAIResponse,
    getAIApprovalStatus,
    testAIProviderConnection
} from "../controllers/aiController.js";

import {
    auth
} from "../middleware/authMiddleware.js";

import {
    aiLimiter
} from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.get("/ai/approval-status", auth, getAIApprovalStatus);
router.post("/ai/test-connection", auth, aiLimiter, testAIProviderConnection);
router.post("/ai", auth, aiLimiter, generateAIResponse);

export default router;
