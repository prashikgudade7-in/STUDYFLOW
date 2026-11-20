import express from "express";

import { updateProfile } from "../controllers/userController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Update user profile
router.post("/profile", auth, updateProfile);

export default router;
