import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../../utils/logger.util";

const anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
});

const ANTHROPIC_MODELS = {
    SONNET: "claude-sonnet-4-5",
} as const;

type AnthropicModel = (typeof ANTHROPIC_MODELS)[keyof typeof ANTHROPIC_MODELS];

interface AnthropicChatOptions {
    model?: AnthropicModel;
    maxTokens?: number;
    systemPrompt?: string;
    temperature?: number;
}

interface AnthropicMessage {
    role: "user" | "assistant";
    content: string;
}

async function anthropicChat(
    messages: AnthropicMessage[],
    options: AnthropicChatOptions = {}
) {
    const {
        model = ANTHROPIC_MODELS.SONNET,
        maxTokens = 1024,
        systemPrompt,
        temperature = 1,
    } = options;

    const response = await anthropicClient.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(systemPrompt && { system: systemPrompt }),
        messages,
    });

    const textContent = response.content.find((block) => block.type === "text");

    logger.info("Anthropic", "Chat completion successful", {
        model: response.model,
        stopReason: response.stop_reason,
        usage: response.usage,
    });

    return {
        content: textContent?.type === "text" ? textContent.text : "",
        usage: response.usage,
        model: response.model,
        stopReason: response.stop_reason,
    };
}

async function anthropicStream(
    messages: AnthropicMessage[],
    options: AnthropicChatOptions = {}
) {
    const {
        model = ANTHROPIC_MODELS.SONNET,
        maxTokens = 1024,
        systemPrompt,
        temperature = 1,
    } = options;

    logger.verbose("Anthropic", "Stream initiated", { model, maxTokens });

    return anthropicClient.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(systemPrompt && { system: systemPrompt }),
        messages,
    });
}

export {
    anthropicClient,
    anthropicChat,
    anthropicStream,
    ANTHROPIC_MODELS,
    AnthropicChatOptions,
    AnthropicMessage,
};