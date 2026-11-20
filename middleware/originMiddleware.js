const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function validateOriginConfig() {
    const configuredOrigin = process.env.APP_ORIGIN;

    if (!configuredOrigin && process.env.NODE_ENV === "production") {
        throw new Error("APP_ORIGIN must be set to the public HTTPS origin in production.");
    }

    let parsed;

    try {
        parsed = new URL(configuredOrigin || "http://localhost:3000");
    } catch {
        throw new Error("APP_ORIGIN must be a valid origin URL.");
    }

    if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        !["", "/"].includes(parsed.pathname) ||
        parsed.search ||
        parsed.hash ||
        (process.env.NODE_ENV === "production" && parsed.protocol !== "https:")
    ) {
        throw new Error("APP_ORIGIN must be an origin URL without a path; production requires HTTPS.");
    }

    return parsed.origin;
}

export function checkOrigin(req, res, next) {
    if (SAFE_METHODS.has(req.method)) {
        return next();
    }

    const origin = req.get("origin");

    if (!origin) {
        return res.status(403).json({
            error: "Request origin is required."
        });
    }

    try {
        if (new URL(origin).origin !== validateOriginConfig()) {
            return res.status(403).json({
                error: "Cross-origin requests are not allowed."
            });
        }
    } catch {
        return res.status(403).json({
            error: "Invalid request origin."
        });
    }

    next();
}
