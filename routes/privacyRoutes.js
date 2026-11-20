import express from "express";

import {
    acceptPrivacyConsent,
    getPrivacyConsent
} from "../controllers/privacyController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/privacy/consent", auth, getPrivacyConsent);
router.put("/privacy/consent", auth, acceptPrivacyConsent);

export default router;
