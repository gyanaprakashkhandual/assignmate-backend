import axios, { AxiosInstance } from "axios";
import { logger } from "../../utils/logger.util";
import { console_util } from "../../utils/console.util";
import { IHandwritingSnapshot } from "../../types/core/chat.types";

/*** OpenRouter API Client */
class OpenRouterService {
    private client: AxiosInstance;
    private apiKey: string;
    private modelText: string = "anthropic/claude-sonnet-4.5";
    private modelVision: string = "anthropic/claude-haiku-4.5";

    constructor() {
        this.apiKey = process.env.OPEN_ROUTER_API_KEY || "";

        if (!this.apiKey) {
            throw new Error("OPEN_ROUTER_API_KEY not configured");
        }

        this.client = axios.create({
            baseURL: "https://openrouter.ai/api/v1",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:3000",
                "Content-Type": "application/json",
            },
            timeout: 60000,
        });
    }

    /*** Generate assignment answer */
    async generateAssignmentAnswer(
        question: string,
        chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
        handwritingProfile: IHandwritingSnapshot
    ): Promise<{
        answer: string;
        tokensUsed: number;
        processingTimeMs: number;
    }> {
        const startTime = Date.now();

        const systemPrompt = `You are an academic assignment assistant. Generate detailed, well-written answers to student questions.
    
The student's handwriting profile shows they write with the following characteristics:
- Slant: ${handwritingProfile.extractedStyles.slant}
- Spacing: ${handwritingProfile.extractedStyles.spacing}
- Stroke Weight: ${handwritingProfile.extractedStyles.strokeWeight}
- Line Irregularity: ${handwritingProfile.extractedStyles.lineIrregularity}

Generate answers that are:
1. Comprehensive and detailed
2. Well-structured with clear points
3. Appropriate for academic submission
4. Natural and conversational in tone
5. Include proper formatting where needed (paragraphs, lists, etc.)

Keep responses concise but complete.`;

        const messages = [
            ...chatHistory,
            {
                role: "user" as const,
                content: question,
            },
        ];

        try {
            console_util.verbose("OpenRouterService", "Calling Claude via OpenRouter", {
                model: this.modelText,
                questionLength: question.length,
            });

            const response = await this.client.post("/chat/completions", {
                model: this.modelText,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    ...messages,
                ],
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 0.9,
            });

            const processingTime = Date.now() - startTime;
            const tokensUsed = response.data.usage?.total_tokens || 0;
            const answer = response.data.choices[0]?.message?.content || "";

            if (!answer) {
                throw new Error("No content in OpenRouter response");
            }

            logger.info("OpenRouterService", "Assignment answer generated", {
                tokensUsed,
                processingTimeMs: processingTime,
            });

            console_util.success("OpenRouterService", "Claude response received", {
                answerLength: answer.length,
                processingTimeMs: processingTime,
            });

            return {
                answer,
                tokensUsed,
                processingTimeMs: processingTime,
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            logger.error("OpenRouterService", "Failed to generate answer", {
                error: errorMessage,
                question: question.substring(0, 100),
            });

            console_util.error("OpenRouterService", "Claude API call failed", {
                error: errorMessage,
            });

            throw error;
        }
    }

    /*** Extract handwriting characteristics from image (via Claude Vision) */
    async extractHandwritingCharacteristics(imageUrl: string): Promise<{
        slant: number;
        spacing: number;
        strokeWeight: number;
        lineIrregularity: number;
        inkDensity: number;
        fontFamily?: string;
    }> {
        const systemPrompt = `Analyze the handwriting image and extract numeric characteristics on a scale of 0-1.
    
Return JSON with:
- slant: rightward lean (0=left, 0.5=upright, 1=right)
- spacing: letter spacing density (0=tight, 1=loose)
- strokeWeight: pen pressure (0=light, 1=heavy)
- lineIrregularity: waviness/shakiness (0=perfectly straight, 1=very wavy)
- inkDensity: color saturation (0=light, 1=dark)
- fontFamily: estimated style (e.g. "cursive", "print", "hybrid")`;

        const messages = [
            {
                role: "user" as const,
                content: [
                    {
                        type: "text" as const,
                        text: "Analyze this handwriting sample and extract characteristics.",
                    },
                    {
                        type: "image_url" as const,
                        image_url: {
                            url: imageUrl,
                        },
                    },
                ],
            },
        ];

        try {
            console_util.verbose("OpenRouterService", "Analyzing handwriting image", {
                imageUrl,
            });

            const response = await this.client.post("/chat/completions", {
                model: this.modelVision,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    ...messages,
                ],
                temperature: 0.3,
                max_tokens: 300,
            });

            const responseText = response.data.choices[0]?.message?.content || "";
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error("Could not parse handwriting analysis");
            }

            const characteristics = JSON.parse(jsonMatch[0]);

            logger.info("OpenRouterService", "Handwriting characteristics extracted", {
                characteristics,
            });

            return characteristics;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            logger.error("OpenRouterService", "Failed to extract characteristics", {
                error: errorMessage,
            });

            console_util.error(
                "OpenRouterService",
                "Vision analysis failed",
                errorMessage
            );

            throw error;
        }
    }

    /*** Test connection */
    async testConnection(): Promise<boolean> {
        try {
            const response = await this.client.post("/chat/completions", {
                model: this.modelText,
                messages: [{ role: "user", content: "test" }],
                max_tokens: 10,
            });

            return !!response.data.choices;
        } catch (error) {
            console_util.error(
                "OpenRouterService",
                "Connection test failed",
                error
            );
            return false;
        }
    }
}

export const openRouterService = new OpenRouterService();