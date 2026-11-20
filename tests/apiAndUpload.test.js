import assert from "node:assert/strict";
import test from "node:test";
import { PDFParse } from "pdf-parse";
import {
    generateAIResponse,
    getAIApprovalStatus,
    testAIProviderConnection
} from "../controllers/aiController.js";
import { extractPdfText } from "../controllers/pdfController.js";
import {
    AI_PROVIDER_APPROVAL_REGISTRY,
    AI_PROVIDER_CONTENT_CATEGORIES,
    AI_PROVIDER_PENDING_MESSAGE
} from "../services/aiProviderApprovalRegistry.js";

function response() {
    return {
        statusCode: 200,
        body: undefined,
        headers: {},
        status(code) {
            this.statusCode = code;
            return this;
        },
        set(name, value) {
            this.headers[name] = value;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

test("AI request validation rejects invalid prompt and image data before provider fetch", async () => {
    const originalFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = async () => {
        called = true;
        throw new Error("unexpected provider request");
    };

    try {
        const promptRes = response();
        await generateAIResponse({ body: { provider: "openai", prompt: "" } }, promptRes);
        assert.equal(promptRes.statusCode, 400);

        const imageRes = response();
        await generateAIResponse({
            body: {
                provider: "openai",
                api_key: "test-key",
                model: "gpt-6-luna",
                prompt: "Describe this.",
                image: { mime: "image/svg+xml", data: "PHN2Zz4=" }
            }
        }, imageRes);
        assert.equal(imageRes.statusCode, 400);
        assert.equal(called, false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("AI approval status defaults every provider and content category to pending", () => {
    const res = response();
    getAIApprovalStatus({}, res);

    assert.equal(res.headers["Cache-Control"], "no-store");
    assert.deepEqual(
        Object.keys(res.body.providers).sort(),
        Object.keys(AI_PROVIDER_APPROVAL_REGISTRY).sort()
    );

    for (const categories of Object.values(res.body.providers)) {
        assert.deepEqual(
            Object.keys(categories).sort(),
            [...AI_PROVIDER_CONTENT_CATEGORIES].sort()
        );
        for (const category of Object.values(categories)) {
            assert.equal(category.status, "PENDING");
            assert.equal(category.verificationDate, null);
            assert.equal(category.approved, false);
        }
    }
});

test("unapproved providers cannot receive student text, images, documents, or legacy requests", async () => {
    const originalFetch = globalThis.fetch;
    let providerFetches = 0;
    globalThis.fetch = async () => {
        providerFetches += 1;
        throw new Error("Unapproved provider must not be called.");
    };

    try {
        for (const provider of Object.keys(AI_PROVIDER_APPROVAL_REGISTRY)) {
            for (const category of AI_PROVIDER_CONTENT_CATEGORIES) {
                const body = {
                    provider,
                    api_key: "valid-looking-test-key",
                    model: "test-model",
                    prompt: "Student study material",
                    content_category: category
                };
                if (category === "images") {
                    body.image = {
                        mime: "image/jpeg",
                        data: "aGVsbG8="
                    };
                }

                const res = response();
                await generateAIResponse({ body }, res);
                assert.equal(res.statusCode, 503, `${provider} ${category}`);
                assert.equal(res.body.error, AI_PROVIDER_PENDING_MESSAGE);
            }
        }

        const legacyRes = response();
        await generateAIResponse({
            body: {
                provider: "openai",
                api_key: "valid-looking-test-key",
                model: "test-model",
                prompt: "Potential document or personal content"
            }
        }, legacyRes);
        assert.equal(legacyRes.statusCode, 503);
        assert.equal(legacyRes.body.error, AI_PROVIDER_PENDING_MESSAGE);
        assert.equal(providerFetches, 0);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("provider connection testing sends only the fixed non-student prompt", async () => {
    const originalFetch = globalThis.fetch;
    let capturedBody;
    globalThis.fetch = async (_url, options) => {
        capturedBody = JSON.parse(options.body);
        return new Response(JSON.stringify({
            choices: [{ message: { content: "StudyFlow provider connection test." } }]
        }), {
            status: 200,
            headers: { "content-type": "application/json" }
        });
    };

    try {
        const rejectedRes = response();
        await testAIProviderConnection({
            body: {
                provider: "openai",
                api_key: "test-key",
                model: "gpt-6-luna",
                prompt: "student private material",
                image: { mime: "image/jpeg", data: "aGVsbG8=" }
            }
        }, rejectedRes);
        assert.equal(rejectedRes.statusCode, 400);
        assert.equal(capturedBody, undefined);

        const res = response();
        await testAIProviderConnection({
            body: {
                provider: "openai",
                api_key: "test-key",
                model: "gpt-6-luna",
                personal_information: "must-not-be-forwarded",
                study_records: "must-not-be-forwarded"
            }
        }, res);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, { ok: true });
        assert.equal(
            capturedBody.messages[1].content,
            "Reply with exactly: StudyFlow provider connection test."
        );
        assert.equal(
            JSON.stringify(capturedBody).includes("must-not-be-forwarded"),
            false
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("PDF upload rejects malformed base64 and non-PDF payloads", async () => {
    const malformedRes = response();
    await extractPdfText({ body: { data: "not base64" } }, malformedRes);
    assert.equal(malformedRes.statusCode, 400);

    const signatureRes = response();
    await extractPdfText({
        body: { data: Buffer.from("plain text").toString("base64") }
    }, signatureRes);
    assert.equal(signatureRes.statusCode, 400);
});

test("PDF parser failures do not log parser messages", async () => {
    const originalGetText = PDFParse.prototype.getText;
    const originalConsoleError = console.error;
    const messages = [];
    PDFParse.prototype.getText = async function () {
        throw new Error("private-test-marker");
    };
    console.error = (...args) => messages.push(args.join(" "));

    try {
        const res = response();
        await extractPdfText({
            body: { data: Buffer.from("%PDF-test").toString("base64") }
        }, res);

        assert.equal(res.statusCode, 400);
        assert.deepEqual(messages, ["PDF extraction failed: Error"]);
        assert.equal(messages.some((message) =>
            message.includes("private-test-marker")
        ), false);
    } finally {
        PDFParse.prototype.getText = originalGetText;
        console.error = originalConsoleError;
    }
});
