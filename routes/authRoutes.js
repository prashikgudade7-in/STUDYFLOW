import express from "express";

import {
    getMe,
    signup,
    login,
    logout
} from "../controllers/authController.js";

import {
    loginLimiter,
    signupLimiter
} from "../middleware/rateLimitMiddleware.js";
import { loginIdentifierRateLimit } from "../middleware/loginIdentifierRateLimit.js";

const router = express.Router();

router.get("/me", getMe);

router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, loginIdentifierRateLimit, login);

router.post("/logout", logout);

export default router;
