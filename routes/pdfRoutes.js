import express from "express";

import { extractPdfText } from "../controllers/pdfController.js";
import { auth } from "../middleware/authMiddleware.js";
import { pdfLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.post("/pdf-text", auth, pdfLimiter, extractPdfText);

export default router;
