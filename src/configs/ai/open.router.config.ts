import { logger } from "../../utils/logger.util";

const OPEN_ROUTER_BASE_URL = process.env.OPEN_ROUTER_BASE_URL ?? "https://openrouter.ai/api/v1/chat/completions";

const OPENROUTER_MODELS = {
    GPT5: "openai/gpt-4o",
} as const;

type OpenRouterModel = (typeof OPENROUTER_MODELS)[keyof typeof OPENROUTER_MODELS];

interface OpenRouterChatOptions {
    model?: OpenRouterModel;
    maxTokens?: number;
    systemPrompt?: string;
    temperature?: number;
    reasoning?: { enabled: boolean };
}

interface OpenRouterMessage {
    role: "user" | "assistant";
    content: string;
    reasoning_details?: unknown;
}

function buildHeaders() {
    return {
        Authorization: `Bearer ${process.env.OPEN_ROUTER_API_KEY!}`,
        "Content-Type": "application/json",
    };
}

async function openRouterChat(
    messages: OpenRouterMessage[],
    options: OpenRouterChatOptions = {}
) {
    const {
        model = OPENROUTER_MODELS.GPT5,
        maxTokens = 1024,
        systemPrompt,
        temperature = 1,
        reasoning,
    } = options;

    const formattedMessages = [
        ...(systemPrompt
            ? [{ role: "system" as const, content: systemPrompt }]
            : []),
        ...messages,
    ];

    const response = await fetch(OPEN_ROUTER_BASE_URL, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature,
            messages: formattedMessages,
            ...(reasoning && { reasoning }),
        }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
        logger.error("OpenRouter", "API error response", {
            status: response.status,
            error: data.error,
        });
        throw new Error(data.error?.message ?? `OpenRouter error: ${response.status}`);
    }

    if (!data.choices?.length) {
        logger.error("OpenRouter", "Empty choices in response", { data });
        throw new Error("OpenRouter returned no choices");
    }

    const message = data.choices[0].message;

    logger.info("OpenRouter", "Chat completion successful", {
        model: data.model,
        stopReason: data.choices[0].finish_reason,
        usage: data.usage,
    });

    return {
        content: message.content ?? "",
        reasoning_details: message.reasoning_details,
        usage: data.usage,
        model: data.model,
        stopReason: data.choices[0].finish_reason,
    };
}

async function openRouterStream(
    messages: OpenRouterMessage[],
    options: OpenRouterChatOptions = {}
) {
    const {
        model = OPENROUTER_MODELS.GPT5,
        maxTokens = 1024,
        systemPrompt,
        temperature = 1,
        reasoning,
    } = options;

    const formattedMessages = [
        ...(systemPrompt
            ? [{ role: "system" as const, content: systemPrompt }]
            : []),
        ...messages,
    ];

    logger.verbose("OpenRouter", "Stream initiated", { model, maxTokens });

    const response = await fetch(OPEN_ROUTER_BASE_URL, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature,
            messages: formattedMessages,
            stream: true,
            ...(reasoning && { reasoning }),
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        logger.error("OpenRouter", "Stream request failed", {
            status: response.status,
            error,
        });
        throw new Error((error as any)?.error?.message ?? `OpenRouter stream error: ${response.status}`);
    }

    return response.body;
}

export {
    openRouterChat,
    openRouterStream,
    OPENROUTER_MODELS,
    OpenRouterChatOptions,
    OpenRouterMessage,
};