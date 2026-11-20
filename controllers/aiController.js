import { callAI } from "../services/aiService.js";
import {
    AI_PROVIDER_CONTENT_CATEGORIES,
    AI_PROVIDER_APPROVAL_REGISTRY,
    getAIProviderApprovalBlock,
    getAIProviderApprovalStatus
} from "../services/aiProviderApprovalRegistry.js";

const MAX_PROMPT_LENGTH = 12000;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AI_CONNECTION_TEST_PROMPT =
    "Reply with exactly: StudyFlow provider connection test.";

export async function generateAIResponse(req, res) {
    const data = req.body;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return res.status(400).json({
            error: "Invalid AI request."
        });
    }

    if (
        typeof data.prompt !== "string" ||
        !data.prompt.trim() ||
        data.prompt.length > MAX_PROMPT_LENGTH
    ) {
        return res.status(400).json({
            error: "Prompt must contain between 1 and 12,000 characters."
        });
    }

    if (
        typeof data.provider !== "string" ||
        data.provider.length > 30 ||
        typeof data.model !== "string" ||
        data.model.length > 150 ||
        (
            data.endpoint !== undefined &&
            (
                typeof data.endpoint !== "string" ||
                data.endpoint.length > 300
            )
        )
    ) {
        return res.status(400).json({
            error: "Invalid AI provider settings."
        });
    }

    if (
        data.content_category !== undefined &&
        !AI_PROVIDER_CONTENT_CATEGORIES.includes(data.content_category)
    ) {
        return res.status(400).json({
            error: "Invalid AI content category."
        });
    }

    if (data.image !== undefined) {
        if (
            !data.image ||
            typeof data.image !== "object" ||
            typeof data.image.data !== "string" ||
            !data.image.data ||
            data.image.data.length % 4 !== 0 ||
            data.image.data.length > Math.ceil(MAX_IMAGE_SIZE * 4 / 3) ||
            !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data.image.data) ||
            !IMAGE_TYPES.has(data.image.mime) ||
            Buffer.from(data.image.data, "base64").length > MAX_IMAGE_SIZE
        ) {
            return res.status(400).json({
                error: "Invalid image or image exceeds the 8 MB limit."
            });
        }
    }

    if (!AI_PROVIDER_APPROVAL_REGISTRY[data.provider]) {
        return res.status(400).json({
            error: "Unsupported AI provider."
        });
    }

    // Prompt text can contain document-derived data, so all categories must be approved.
    const approvalError = getAIProviderApprovalBlock(
        data.provider,
        AI_PROVIDER_CONTENT_CATEGORIES
    );

    if (approvalError) {
        res.set("Cache-Control", "no-store");
        return res.status(503).json({
            error: approvalError
        });
    }

    if (
        typeof data.api_key !== "string" ||
        !data.api_key.trim() ||
        data.api_key.length > 500
    ) {
        return res.status(400).json({
            error: "Please provide a valid AI API key."
        });
    }

    try {
        const text = await callAI(data);

        return res.json({ text });

    } catch (e) {
        console.error("AI request failed:", e.name || "Unknown error");

        return res.status(502).json({
            error: "AI request failed. Check your provider settings and try again."
        });
    }
}

export async function testAIProviderConnection(req, res) {
    const data = req.body;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return res.status(400).json({
            error: "Invalid provider test request."
        });
    }

    if (
        ["prompt", "image", "document", "documents"].some(
            field => Object.hasOwn(data, field)
        )
    ) {
        return res.status(400).json({
            error: "Provider connection tests cannot include student content."
        });
    }

    if (
        typeof data.provider !== "string" ||
        !AI_PROVIDER_APPROVAL_REGISTRY[data.provider] ||
        typeof data.model !== "string" ||
        data.model.length > 150 ||
        (
            data.endpoint !== undefined &&
            (
                typeof data.endpoint !== "string" ||
                data.endpoint.length > 300
            )
        ) ||
        typeof data.api_key !== "string" ||
        !data.api_key.trim() ||
        data.api_key.length > 500
    ) {
        return res.status(400).json({
            error: "Invalid AI provider settings."
        });
    }

    try {
        await callAI({
            provider: data.provider,
            model: data.model,
            endpoint: data.endpoint,
            api_key: data.api_key,
            prompt: AI_CONNECTION_TEST_PROMPT
        });

        return res.json({ ok: true });
    } catch (error) {
        console.error("AI provider connection test failed:", error.name || "Error");

        return res.status(502).json({
            error: "AI provider connection test failed. Check the provider settings and try again."
        });
    }
}

export function getAIApprovalStatus(req, res) {
    res.set("Cache-Control", "no-store");
    res.json({
        providers: getAIProviderApprovalStatus()
    });
}
