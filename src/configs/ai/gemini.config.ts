import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
    Content,
    GenerationConfig,
} from "@google/generative-ai";
import { logger } from "../../utils/logger.util";

const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const GEMINI_MODELS = {
    FLASH: "gemini-1.5-flash",
    PRO: "gemini-1.5-pro",
    FLASH_2: "gemini-2.0-flash",
} as const;

type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];

interface GeminiChatOptions {
    model?: GeminiModel;
    systemPrompt?: string;
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
}

interface GeminiMessage {
    role: "user" | "model";
    content: string;
}

const defaultSafetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
];

function buildGenerationConfig(options: GeminiChatOptions): GenerationConfig {
    return {
        temperature: options.temperature ?? 1,
        maxOutputTokens: options.maxOutputTokens ?? 1024,
        topP: options.topP ?? 0.95,
        topK: options.topK ?? 40,
    };
}

function toGeminiHistory(messages: GeminiMessage[]): Content[] {
    return messages.map(({ role, content }) => ({
        role,
        parts: [{ text: content }],
    }));
}

async function geminiChat(
    messages: GeminiMessage[],
    options: GeminiChatOptions = {}
) {
    const { model = GEMINI_MODELS.FLASH, systemPrompt } = options;

    const geminiModel = geminiClient.getGenerativeModel({
        model,
        safetySettings: defaultSafetySettings,
        generationConfig: buildGenerationConfig(options),
        ...(systemPrompt && { systemInstruction: systemPrompt }),
    });

    const history = toGeminiHistory(messages.slice(0, -1));
    const lastMessage = messages[messages.length - 1];

    const chat = geminiModel.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    logger.info("Gemini", "Chat completion successful", {
        model,
        usageMetadata: response.usageMetadata,
    });

    return {
        content: response.text(),
        candidates: response.candidates,
        usageMetadata: response.usageMetadata,
    };
}

async function geminiStream(
    messages: GeminiMessage[],
    options: GeminiChatOptions = {}
) {
    const { model = GEMINI_MODELS.FLASH, systemPrompt } = options;

    const geminiModel = geminiClient.getGenerativeModel({
        model,
        safetySettings: defaultSafetySettings,
        generationConfig: buildGenerationConfig(options),
        ...(systemPrompt && { systemInstruction: systemPrompt }),
    });

    const history = toGeminiHistory(messages.slice(0, -1));
    const lastMessage = messages[messages.length - 1];

    logger.verbose("Gemini", "Stream chat initiated", { model });

    const chat = geminiModel.startChat({ history });
    return chat.sendMessageStream(lastMessage.content);
}

async function geminiGenerateContent(prompt: string, options: GeminiChatOptions = {}) {
    const { model = GEMINI_MODELS.FLASH, systemPrompt } = options;

    const geminiModel = geminiClient.getGenerativeModel({
        model,
        safetySettings: defaultSafetySettings,
        generationConfig: buildGenerationConfig(options),
        ...(systemPrompt && { systemInstruction: systemPrompt }),
    });

    const result = await geminiModel.generateContent(prompt);

    logger.info("Gemini", "Content generation successful", {
        model,
        usageMetadata: result.response.usageMetadata,
    });

    return {
        content: result.response.text(),
        usageMetadata: result.response.usageMetadata,
    };
}

export {
    geminiClient,
    geminiChat,
    geminiStream,
    geminiGenerateContent,
    GEMINI_MODELS,
    GeminiChatOptions,
    GeminiMessage,
};