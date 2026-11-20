import express from "express";

import {
    getData,
    saveData,
    deleteData,
    exportAccountData,
    deleteAccount
} from "../controllers/dataController.js";

import { auth } from "../middleware/authMiddleware.js";
import {
    accountExportLimiter,
    accountDeletionLimiter,
    userDataDeletionLimiter
} from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.get("/account/export", auth, accountExportLimiter, exportAccountData);
router.delete("/account", auth, accountDeletionLimiter, deleteAccount);

// Load user records
router.get("/data", auth, getData);

// Save or update user records
router.post("/data", auth, saveData);

// Delete a user record
router.delete("/data", auth, userDataDeletionLimiter, deleteData);

export default router;
