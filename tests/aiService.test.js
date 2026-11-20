import assert from "node:assert/strict";
import test from "node:test";
import { callAI } from "../services/aiService.js";

const prompt = "Explain fractions simply.";
const key = "test-provider-key";
const expectedAnswers = {
    openai: "OpenAI answer",
    azure: "Azure answer",
    deepseek: "DeepSeek answer",
    grok: "Grok answer",
    mistral: "Mistral answer",
    llama: "Llama answer"
};

function providerResponse(provider) {
    if (provider === "gemini") {
        return {
            candidates: [{ content: { parts: [{ text: "Gemini answer" }] } }]
        };
    }

    if (provider === "claude") {
        return { content: [{ type: "text", text: "Claude answer" }] };
    }

    if (provider === "cohere") {
        return { message: { content: [{ type: "text", text: "Cohere answer" }] } };
    }

    if (provider === "perplexity") {
        return {
            output: [{
                type: "message",
                content: [{ type: "output_text", text: "Perplexity answer" }]
            }]
        };
    }

    const labels = {
        openai: "OpenAI",
        azure: "Azure",
        deepseek: "DeepSeek",
        grok: "Grok",
        mistral: "Mistral",
        llama: "Llama"
    };

    return {
        choices: [{ message: { content: `${labels[provider]} answer` } }]
    };
}

const adapters = [
    {
        provider: "openai",
        url: "https://api.openai.com/v1/chat/completions",
        authHeader: "authorization",
        model: "gpt-6-luna"
    },
    {
        provider: "gemini",
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
        authHeader: "x-goog-api-key",
        model: "gemini-3.5-flash-lite"
    },
    {
        provider: "claude",
        url: "https://api.anthropic.com/v1/messages",
        authHeader: "x-api-key",
        model: "claude-haiku-5-5"
    },
    {
        provider: "azure",
        url: "https://studyflow-test.openai.azure.com/openai/v1/chat/completions",
        authHeader: "api-key",
        model: "study-deployment",
        endpoint: "https://studyflow-test.openai.azure.com"
    },
    {
        provider: "perplexity",
        url: "https://api.perplexity.ai/v1/agent",
        authHeader: "authorization",
        model: "perplexity/sonar"
    },
    {
        provider: "deepseek",
        url: "https://api.deepseek.com/chat/completions",
        authHeader: "authorization",
        model: "deepseek-flash",
        image: true
    },
    {
        provider: "grok",
        url: "https://api.x.ai/v1/chat/completions",
        authHeader: "authorization",
        model: "grok-4.7",
        image: true
    },
    {
        provider: "mistral",
        url: "https://api.mistral.ai/v1/chat/completions",
        authHeader: "authorization",
        model: "mistral-small-latest"
    },
    {
        provider: "cohere",
        url: "https://api.cohere.com/v2/chat",
        authHeader: "authorization",
        model: "command-a-03-2025"
    },
    {
        provider: "llama",
        url: "https://api.fireworks.ai/inference/v1/chat/completions",
        authHeader: "authorization",
        model: "accounts/fireworks/models/llama-v3p3-70b-instruct"
    }
];

test("all ten provider adapters send provider-specific requests and parse responses", async () => {
    const originalFetch = globalThis.fetch;

    try {
        for (const adapter of adapters) {
            let captured;
            globalThis.fetch = async (url, options) => {
                captured = { url: String(url), options };
                return new Response(JSON.stringify(providerResponse(adapter.provider)), {
                    status: 200,
                    headers: { "content-type": "application/json" }
                });
            };

            const result = await callAI({
                provider: adapter.provider,
                api_key: key,
                model: adapter.provider === "azure" ? adapter.model : "",
                endpoint: adapter.endpoint,
                prompt,
                image: adapter.image
                    ? { mime: "image/jpeg", data: "aGVsbG8=" }
                    : undefined
            });

            assert.equal(captured.url, adapter.url, `${adapter.provider} endpoint`);
            assert.equal(captured.options.method, "POST");
            assert.equal(captured.options.redirect, "error");
            const headers = new Headers(captured.options.headers);
            assert.equal(
                headers.get(adapter.authHeader),
                adapter.authHeader === "authorization" ? `Bearer ${key}` : key,
                `${adapter.provider} authentication`
            );

            const body = JSON.parse(captured.options.body);
            if (adapter.provider === "gemini") {
                assert.equal(captured.url.includes(adapter.model), true);
            } else {
                assert.equal(body.model, adapter.model, `${adapter.provider} model`);
            }

            if (adapter.provider === "perplexity") {
                assert.equal(body.input, prompt);
                assert.equal(body.instructions.includes("StudyFlow"), true);
                assert.equal(result, "Perplexity answer");
            } else if (adapter.provider === "gemini") {
                assert.equal(body.contents[0].parts[0].text.includes(prompt), true);
                assert.equal(result, "Gemini answer");
            } else if (adapter.provider === "claude") {
                assert.equal(body.messages[0].content.some(part => part.text === prompt), true);
                assert.equal(headers.get("anthropic-version"), "2023-06-01");
                assert.equal(result, "Claude answer");
            } else if (adapter.provider === "cohere") {
                assert.equal(body.messages[1].content, prompt);
                assert.equal(result, "Cohere answer");
            } else {
                const userMessage = body.messages.find(message => message.role === "user");
                if (adapter.image) {
                    assert.equal(Array.isArray(userMessage.content), true);
                    assert.equal(userMessage.content[1].type, "image_url");
                } else {
                    assert.equal(userMessage.content, prompt);
                }
                assert.equal(result, expectedAnswers[adapter.provider]);
            }
        }
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("legacy Perplexity model preference maps to the supported Sonar model", async () => {
    const originalFetch = globalThis.fetch;
    let captured;
    globalThis.fetch = async (_url, options) => {
        captured = JSON.parse(options.body);
        return new Response(JSON.stringify(providerResponse("perplexity")));
    };

    try {
        await callAI({
            provider: "perplexity",
            api_key: key,
            model: "sonar",
            prompt
        });
        assert.equal(captured.model, "perplexity/sonar");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("image input is rejected for text-only hosted Llama", async () => {
    await assert.rejects(
        callAI({
            provider: "llama",
            api_key: key,
            prompt,
            image: { mime: "image/jpeg", data: "aGVsbG8=" }
        }),
        /Image input is not supported/
    );
});

test("Azure endpoints outside approved resource origins are rejected before fetch", async () => {
    const originalFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = async () => {
        called = true;
        throw new Error("unexpected request");
    };

    try {
        await assert.rejects(
            callAI({
                provider: "azure",
                api_key: key,
                model: "deployment",
                endpoint: "https://attacker.example",
                prompt
            }),
            /valid HTTPS Azure OpenAI resource URL/
        );
        assert.equal(called, false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
