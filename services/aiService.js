export async function callAI(d) {
    const provider = String(d.provider || "");
    const key = String(d.api_key || "");
    const prompt = String(d.prompt || "");

    if (!key || !prompt) {
        throw new Error("Choose an AI provider, enter its API key and add a prompt.");
    }

    const model = String(d.model || "");

    const config = {
        openai: {
            url: "https://api.openai.com/v1/chat/completions",
            model: "gpt-6-luna",
            kind: "openai",
            supportsImages: true
        },
        gemini: {
            url: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            model: "gemini-3.5-flash-lite",
            kind: "gemini",
            supportsImages: true
        },
        claude: {
            url: "https://api.anthropic.com/v1/messages",
            model: "claude-haiku-5-5",
            kind: "claude",
            supportsImages: true
        },
        azure: {
            url: "",
            model: "",
            kind: "azure"
        },
        perplexity: {
            url: "https://api.perplexity.ai/v1/agent",
            model: "perplexity/sonar",
            kind: "perplexity"
        },
        deepseek: {
            url: "https://api.deepseek.com/chat/completions",
            model: "deepseek-flash",
            kind: "openai",
            supportsImages: true
        },
        grok: {
            url: "https://api.x.ai/v1/chat/completions",
            model: "grok-4.7",
            kind: "openai",
            supportsImages: true
        },
        mistral: {
            url: "https://api.mistral.ai/v1/chat/completions",
            model: "mistral-small-latest",
            kind: "openai"
        },
        cohere: {
            url: "https://api.cohere.com/v2/chat",
            model: "command-a-03-2025",
            kind: "cohere"
        },
        llama: {
            url: "https://api.fireworks.ai/inference/v1/chat/completions",
            model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
            kind: "openai"
        }
    }[provider];

    if (!config) {
        throw new Error("Unsupported AI provider.");
    }

    const selectedModel = model || config.model;

    if (provider === "azure" && !selectedModel) {
        throw new Error("Enter the Azure deployment name in the Model field.");
    }

    let endpoint = config.url;

    if (provider === "azure") {
        let azureResource;

        try {
            azureResource = new URL(String(d.endpoint || "").trim());
        } catch {
            throw new Error("Enter a valid Azure resource URL.");
        }

        if (
            azureResource.protocol !== "https:" ||
            !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.openai\.azure\.com$/i.test(azureResource.hostname) ||
            azureResource.username ||
            azureResource.password ||
            azureResource.port ||
            !["", "/"].includes(azureResource.pathname) ||
            azureResource.search ||
            azureResource.hash
        ) {
            throw new Error("Enter a valid HTTPS Azure OpenAI resource URL.");
        }

        endpoint = `${azureResource.origin}/openai/v1/chat/completions`;
    }

    if (!endpoint) {
        throw new Error("This AI provider is currently unsupported.");
    }

    if (provider === "gemini") {
        endpoint = endpoint.replace("{model}", selectedModel);
    }

    const allowedHosts = {
        openai: "api.openai.com",
        gemini: "generativelanguage.googleapis.com",
        claude: "api.anthropic.com",
        perplexity: "api.perplexity.ai",
        deepseek: "api.deepseek.com",
        grok: "api.x.ai",
        mistral: "api.mistral.ai",
        cohere: "api.cohere.com",
        llama: "api.fireworks.ai"
    };

    let parsed;

    try {
        parsed = new URL(endpoint);
    } catch {
        throw new Error("Invalid AI provider endpoint.");
    }

    const expectedHost = allowedHosts[provider];

    if (
        parsed.protocol !== "https:" ||
        (
            provider === "azure"
                ? !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.openai\.azure\.com$/i.test(parsed.hostname)
                : !expectedHost || parsed.hostname.toLowerCase() !== expectedHost
        ) ||
        parsed.username ||
        parsed.password ||
        parsed.port
    ) {
        throw new Error(
            "The AI provider endpoint is not an approved address."
        );
    }

    const image = d.image;

    if (image && !config.supportsImages) {
        throw new Error(`Image input is not supported by the ${provider} adapter.`);
    }

    const system = "You are StudyFlow, a careful and encouraging study assistant. Match explanations to the student's class and board when provided. Do not claim certainty when unsure.";

    let headers = {
        "Content-Type": "application/json"
    };

    let body;

    if (config.kind === "openai") {
        let content = prompt;

        if (image) {
            content = [
                { type: "text", text: prompt },
                {
                    type: "image_url",
                    image_url: {
                        url: `data:${image.mime || "image/jpeg"};base64,${image.data || ""}`
                    }
                }
            ];
        }

        body = {
            model: selectedModel,
            messages: [
                { role: "system", content: system },
                { role: "user", content }
            ],
            temperature: 0.4
        };

        headers.Authorization = `Bearer ${key}`;

    } else if (config.kind === "perplexity") {
        body = {
            model: selectedModel === "sonar" ? config.model : selectedModel,
            instructions: system,
            input: prompt,
            max_output_tokens: 1800
        };

        headers.Authorization = `Bearer ${key}`;

    } else if (config.kind === "claude") {
        const content = [
            { type: "text", text: prompt }
        ];

        if (image) {
            content.unshift({
                type: "image",
                source: {
                    type: "base64",
                    media_type: image.mime || "image/jpeg",
                    data: image.data || ""
                }
            });
        }

        body = {
            model: selectedModel,
            max_tokens: 1800,
            system,
            messages: [
                { role: "user", content }
            ]
        };

        headers["x-api-key"] = key;
        headers["anthropic-version"] = "2023-06-01";

    } else if (config.kind === "gemini") {
        headers["x-goog-api-key"] = key;

        const parts = [
            { text: system + "\n\n" + prompt }
        ];

        if (image) {
            parts.push({
                inline_data: {
                    mime_type: image.mime || "image/jpeg",
                    data: image.data || ""
                }
            });
        }

        body = {
            contents: [{ parts }],
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 1800
            }
        };

    } else if (config.kind === "cohere") {
        if (image) {
            throw new Error("Image input is not supported by this Cohere adapter. Paste the extracted text instead.");
        }

        body = {
            model: selectedModel,
            messages: [
                { role: "system", content: system },
                { role: "user", content: prompt }
            ],
            temperature: 0.4
        };

        headers.Authorization = `Bearer ${key}`;

    } else {
        body = {
            messages: [
                { role: "system", content: system },
                { role: "user", content: prompt }
            ],
            temperature: 0.4
        };

        body.model = selectedModel;

        if (provider === "azure") {
            headers["api-key"] = key;
        } else {
            headers.Authorization = `Bearer ${key}`;
        }
    }

    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        65000
    );

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
            redirect: "error"
        });

        const MAX_RESPONSE_SIZE = 2 * 1024 * 1024;

        const contentLength = Number(
            response.headers.get("content-length") || 0
        );

        if (contentLength > MAX_RESPONSE_SIZE) {
            throw new Error("AI provider response is too large.");
        }

        if (!response.body) {
            throw new Error("AI provider returned an empty response.");
        }

        const reader = response.body.getReader();
        const chunks = [];
        let totalSize = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                totalSize += value.byteLength;

                if (totalSize > MAX_RESPONSE_SIZE) {
                    await reader.cancel().catch(() => {});
                    throw new Error("AI provider response is too large.");
                }

                chunks.push(value);
            }
        } finally {
            reader.releaseLock();
        }

        const responseBytes = new Uint8Array(totalSize);
        let offset = 0;

        for (const chunk of chunks) {
            responseBytes.set(chunk, offset);
            offset += chunk.byteLength;
        }

        const raw = new TextDecoder().decode(responseBytes);

        let result;

        try {
            result = JSON.parse(raw);
        } catch {
            throw new Error("AI provider returned an unreadable response.");
        }

        if (!response.ok) {
            throw new Error(
                `AI provider returned HTTP ${response.status}. Check your API key and provider settings.`
            );
        }

        let text;

        if (config.kind === "openai" || config.kind === "azure") {
            const content = result.choices?.[0]?.message?.content;
            text = typeof content === "string"
                ? content
                : Array.isArray(content)
                    ? content.filter(x => x.type === "text").map(x => x.text || "").join("\n")
                    : "";
        } else if (config.kind === "claude") {
            text = (result.content || [])
                .filter(x => x.type === "text")
                .map(x => x.text)
                .join("\n");
        } else if (config.kind === "gemini") {
            text = (result.candidates?.[0]?.content?.parts || [])
                .map(x => x.text || "")
                .join("\n");
        } else if (config.kind === "perplexity") {
            text = (result.output || [])
                .filter(item => item.type === "message")
                .flatMap(item => item.content || [])
                .filter(item => item.type === "output_text")
                .map(item => item.text || "")
                .join("\n");
        } else {
            text = (result.message?.content || [])
                .filter(x => x.type === "text")
                .map(x => x.text || "")
                .join("\n");
        }

        if (typeof text !== "string" || !text.trim()) {
            throw new Error("AI provider returned no text. Check the selected model and try again.");
        }

        return text;

    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                "AI provider request timed out. Please try again."
            );
        }

        throw error;
    } finally {
        clearTimeout(timer);
    }
}
