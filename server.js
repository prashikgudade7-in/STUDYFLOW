import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import dataRoutes from "./routes/dataRoutes.js";
import challengeRoutes from "./routes/challengeRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import privacyRoutes from "./routes/privacyRoutes.js";
import pdfRoutes from "./routes/pdfRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import {
    checkOrigin,
    validateOriginConfig
} from "./middleware/originMiddleware.js";
import { startSessionCleanup } from "./utils/sessionCleanup.js";
import db, { closeDatabase } from "./config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT || 3000);
const trustedProxies = process.env.TRUST_PROXY;

if (trustedProxies) {
    if (trustedProxies.trim().toLowerCase() === "true") {
        throw new Error("TRUST_PROXY must name trusted proxy addresses or a hop count, not 'true'.");
    }

    const entries = trustedProxies.split(",").map(value => value.trim()).filter(Boolean);
    const trustSetting = entries.length === 1 && /^\d+$/.test(entries[0])
        ? Number(entries[0])
        : entries;

    app.set("trust proxy", trustSetting);
}

// Security and request configuration
app.disable("x-powered-by");

app.use(cookieParser());

// Security headers
app.use((req, res, next) => {
    res.set({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Content-Security-Policy":
            "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self';"
    });

    if (process.env.NODE_ENV === "production") {
        res.set("Strict-Transport-Security", "max-age=31536000");
    }

    next();
});

// API routes
const api = express.Router();

// Protect API requests against cross-origin submissions
api.use(checkOrigin);
api.use(express.json({ limit: "30mb" }));

api.get("/healthz", (req, res) => {
    try {
        db.prepare("SELECT 1").get();
        return res.json({ status: "ok" });
    } catch (error) {
        console.error("Health check failed:", error.name || "DatabaseError");
        return res.status(503).json({ status: "unavailable" });
    }
});

api.use("/", authRoutes);
api.use("/", userRoutes);
api.use("/", dataRoutes);
api.use("/", challengeRoutes);
api.use("/", notificationRoutes);
api.use("/", privacyRoutes);
api.use("/", pdfRoutes);
api.use("/", aiRoutes);

app.use("/api", api);

// Frontend static files
app.use(
    express.static(
        path.join(__dirname, "public"),
        { extensions: ["html"] }
    )
);

// Frontend fallback
app.use((req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// Global error handler
app.use((err, req, res, next) => {
    const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600
        ? err.status
        : 500;

    console.error("Request failed:", err.name || "Error", status);

    res.status(status).json({
        error: status === 413
            ? "Request is too large."
            : "An unexpected server error occurred."
    });
});

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
}

validateOriginConfig();

// Start expired session cleanup
const cleanupTimer = startSessionCleanup();

// Start server
const server = app.listen(PORT, () => {
    console.log(`StudyFlow listening on port ${PORT}.`);
});

// Graceful shutdown
let isShuttingDown = false;

function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`${signal} received. Shutting down StudyFlow...`);

    clearInterval(cleanupTimer);

    server.close((error) => {
        try {
            closeDatabase();
        } catch (dbError) {
            console.error("Database shutdown failed:", dbError);
            process.exitCode = 1;
        }

        if (error) {
            console.error("Server shutdown failed:", error);
            process.exitCode = 1;
        } else {
            console.log("StudyFlow server closed successfully.");
        }
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
