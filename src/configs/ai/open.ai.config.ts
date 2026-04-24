import OpenAI from "openai";
import fs from "fs";
import { logger } from "../../utils/logger.util";


const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

const OPENAI_MODELS = {
    GPT_4O: "gpt-4o",
    GPT_4O_MINI: "gpt-4o-mini",
    WHISPER: "whisper-1",
} as const;

type OpenAIModel = (typeof OPENAI_MODELS)[keyof typeof OPENAI_MODELS];

interface OpenAIChatOptions {
    model?: Exclude<OpenAIModel, "whisper-1">;
    maxTokens?: number;
    systemPrompt?: string;
    temperature?: number;
    stream?: boolean;
}

interface OpenAIMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface WhisperOptions {
    language?: string;
    prompt?: string;
    responseFormat?: "json" | "text" | "srt" | "verbose_json" | "vtt";
    temperature?: number;
}

async function openaiChat(
    messages: OpenAIMessage[],
    options: OpenAIChatOptions = {}
) {
    const {
        model = OPENAI_MODELS.GPT_4O,
        maxTokens = 1024,
        systemPrompt,
        temperature = 1,
    } = options;

    const fullMessages: OpenAIMessage[] = systemPrompt
        ? [{ role: "system", content: systemPrompt }, ...messages]
        : messages;

    const response = await openaiClient.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: fullMessages,
    });

    logger.info("OpenAI", "Chat completion successful", {
        model: response.model,
        finishReason: response.choices[0]?.finish_reason,
        usage: response.usage,
    });

    return {
        content: response.choices[0]?.message?.content ?? "",
        usage: response.usage,
        model: response.model,
        finishReason: response.choices[0]?.finish_reason,
    };
}

async function openaiStream(
    messages: OpenAIMessage[],
    options: OpenAIChatOptions = {}
) {
    const {
        model = OPENAI_MODELS.GPT_4O,
        maxTokens = 1024,
        systemPrompt,
        temperature = 1,
    } = options;

    const fullMessages: OpenAIMessage[] = systemPrompt
        ? [{ role: "system", content: systemPrompt }, ...messages]
        : messages;

    logger.verbose("OpenAI", "Stream chat initiated", { model, maxTokens });

    return openaiClient.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: fullMessages,
        stream: true,
    });
}

async function whisperTranscribe(
    audioFilePath: string,
    options: WhisperOptions = {}
) {
    const {
        language,
        prompt,
        responseFormat = "json",
        temperature = 0,
    } = options;

    const audioFile = fs.createReadStream(audioFilePath);

    const transcription = await openaiClient.audio.transcriptions.create({
        model: OPENAI_MODELS.WHISPER,
        file: audioFile,
        ...(language && { language }),
        ...(prompt && { prompt }),
        response_format: responseFormat,
        temperature,
    });

    logger.info("OpenAI", "Whisper transcription successful", { audioFilePath, language, responseFormat });

    return transcription;
}

async function whisperTranslate(
    audioFilePath: string,
    options: Omit<WhisperOptions, "language"> = {}
) {
    const { prompt, responseFormat = "json", temperature = 0 } = options;

    const audioFile = fs.createReadStream(audioFilePath);

    const translation = await openaiClient.audio.translations.create({
        model: OPENAI_MODELS.WHISPER,
        file: audioFile,
        ...(prompt && { prompt }),
        response_format: responseFormat,
        temperature,
    });

    logger.info("OpenAI", "Whisper translation successful", { audioFilePath, responseFormat });

    return translation;
}

export {
    openaiClient,
    openaiChat,
    openaiStream,
    whisperTranscribe,
    whisperTranslate,
    OPENAI_MODELS,
    OpenAIChatOptions,
    OpenAIMessage,
    WhisperOptions,
};