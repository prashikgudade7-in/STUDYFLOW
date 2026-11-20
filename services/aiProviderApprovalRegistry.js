export const AI_PROVIDER_CONTENT_CATEGORIES = [
    "text",
    "images",
    "documents"
];

export const AI_PROVIDER_APPROVAL_STATUSES = [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "SUSPENDED"
];

export const AI_PROVIDER_APPROVAL_REGISTRY = Object.freeze(
    Object.fromEntries([
        "openai",
        "gemini",
        "claude",
        "azure",
        "perplexity",
        "deepseek",
        "grok",
        "mistral",
        "cohere",
        "llama"
    ].map(provider => [
        provider,
        Object.freeze(Object.fromEntries(
            AI_PROVIDER_CONTENT_CATEGORIES.map(category => [
                category,
                Object.freeze({
                    status: "PENDING",
                    verificationDate: null,
                    evidenceReference: null
                })
            ])
        ))
    ]))
);

export const AI_PROVIDER_PENDING_MESSAGE =
    "This AI provider is not currently available because its student-data privacy review is pending.";

function isValidVerificationDate(date) {
    if (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
        return false;
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    return !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === date &&
        parsedDate.getTime() <= Date.now();
}

function isApproved(entry) {
    return entry?.status === "APPROVED" &&
        isValidVerificationDate(entry.verificationDate) &&
        typeof entry.evidenceReference === "string" &&
        entry.evidenceReference.trim().length > 0;
}

export function getAIProviderApprovalStatus() {
    return Object.fromEntries(
        Object.entries(AI_PROVIDER_APPROVAL_REGISTRY).map(([provider, categories]) => [
            provider,
            Object.fromEntries(
                Object.entries(categories).map(([category, entry]) => [
                    category,
                    {
                        status: entry.status,
                        verificationDate: entry.verificationDate,
                        approved: isApproved(entry)
                    }
                ])
            )
        ])
    );
}

export function getAIProviderApprovalBlock(provider, categories) {
    const providerApprovals = AI_PROVIDER_APPROVAL_REGISTRY[provider];

    if (!providerApprovals) {
        return "Unsupported AI provider.";
    }

    const missingApproval = categories
        .map(category => providerApprovals[category])
        .find(entry => !isApproved(entry));

    if (!missingApproval) {
        return null;
    }

    if (missingApproval.status === "PENDING") {
        return AI_PROVIDER_PENDING_MESSAGE;
    }

    if (missingApproval.status === "REJECTED") {
        return "This AI provider is unavailable because its student-data privacy review was rejected.";
    }

    if (missingApproval.status === "SUSPENDED") {
        return "This AI provider is temporarily unavailable while its student-data privacy approval is suspended.";
    }

    return AI_PROVIDER_PENDING_MESSAGE;
}
