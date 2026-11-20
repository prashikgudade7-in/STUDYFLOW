import {
    CORE_SERVICE_CONSENT_VERSION,
    getCoreServiceConsent,
    recordCoreServiceConsent
} from "../services/privacyConsentService.js";

export function getPrivacyConsent(req, res) {
    res.set("Cache-Control", "no-store");
    return res.json({
        current_version: CORE_SERVICE_CONSENT_VERSION,
        consent: getCoreServiceConsent(req.user.id)
    });
}

export function acceptPrivacyConsent(req, res) {
    const body = req.body;

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).length !== 1 ||
        body.accepted !== true
    ) {
        return res.status(400).json({
            error: "Explicit acceptance of the core service data-use notice is required."
        });
    }

    const consent = recordCoreServiceConsent(req.user.id);
    res.set("Cache-Control", "no-store");
    return res.json({ consent });
}
