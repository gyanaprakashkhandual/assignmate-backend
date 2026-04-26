import mongoose, { Model, Schema } from "mongoose";
import {
    IChatSession,
    IChatMessage,
    IChatStats,
    IChatSearchFilters,
    IHandwritingSnapshot,
} from "../../types/core/chat.types";
import { logger } from "../../utils/logger.util";
import { console_util } from "../../utils/console.util";
import { openRouterService } from "./openrouter.service";
import { renderingService } from "./rendering.service";
import { cloudinaryService } from "./cloudinary.service";
import { ValidationError, NotFoundError } from "../../utils/error.util";

/*** Chat Service */
class ChatService {
    constructor(
        private ChatSessionModel: Model<IChatSession>,
        private ChatMessageModel: Model<IChatMessage>
    ) { }

    /*** Create new chat session */
    async createChatSession(
        userId: Schema.Types.ObjectId,
        title: string,
        handwritingProfile: IHandwritingSnapshot
    ): Promise<IChatSession> {
        try {
            const session = await this.ChatSessionModel.create({
                user: userId,
                title,
                messages: [],
                handwritingProfileSnapshot: handwritingProfile,
                status: "active",
                isStarred: false,
            });

            logger.info("ChatService", "Chat session created", {
                sessionId: session._id,
                userId,
            });

            console_util.success("ChatService", "New chat session", {
                id: session._id,
                title,
            });

            return session;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            logger.error("ChatService", "Failed to create chat session", {
                error: errorMessage,
            });

            throw error;
        }
    }

    /*** Add user question to chat */
    async addUserQuestion(
        chatSessionId: Schema.Types.ObjectId,
        question: string
    ): Promise<IChatMessage> {
        try {
            const session = await this.ChatSessionModel.findById(chatSessionId);
            if (!session) {
                throw new NotFoundError("Chat session");
            }

            const order = session.messages.length;
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const message = await this.ChatMessageModel.create({
                chatSession: chatSessionId,
                type: "user_question",
                content: question,
                order,
                metadata: {
                    messageId,
                    timestamp: new Date(),
                },
            });

            session.messages.push(message._id);
            await session.save();

            logger.info("ChatService", "User question added", {
                messageId: message._id,
                chatSessionId,
            });

            return message;
        } catch (error) {
            logger.error("ChatService", "Failed to add user question", { error });
            throw error;
        }
    }

    /*** Generate AI response */
    async generateAiResponse(
        chatSessionId: Schema.Types.ObjectId,
        userQuestion: string
    ): Promise<IChatMessage> {
        try {
            const session = await this.ChatSessionModel.findById(
                chatSessionId
            ).populate("messages");
            if (!session) {
                throw new NotFoundError("Chat session");
            }

            /*** Build chat history */
            const chatHistory = (session.messages as unknown as IChatMessage[]).map(
                (msg) => ({
                    role: msg.type === "user_question" ? "user" : "assistant",
                    content: msg.content,
                })
            );

            /*** Call Claude via OpenRouter */
            console_util.verbose("ChatService", "Generating AI response...");
            const startTime = Date.now();

            const { answer, tokensUsed, processingTimeMs } =
                await openRouterService.generateAssignmentAnswer(
                    userQuestion,
                    chatHistory,
                    session.handwritingProfileSnapshot
                );

            /*** Save AI response */
            const order = session.messages.length;
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const aiMessage = await this.ChatMessageModel.create({
                chatSession: chatSessionId,
                type: "ai_answer",
                content: answer,
                order,
                metadata: {
                    messageId,
                    timestamp: new Date(),
                    processingTimeMs,
                    tokensUsed,
                    model: "claude-sonnet-4-20250514",
                },
            });

            session.messages.push(new mongoose.Types.ObjectId(aiMessage._id.toString()));
            await session.save();

            logger.info("ChatService", "AI response generated", {
                messageId: aiMessage._id,
                chatSessionId,
                tokensUsed,
                processingTimeMs,
            });

            console_util.success("ChatService", "AI response saved", {
                messageId: aiMessage._id,
            });

            return aiMessage;
        } catch (error) {
            logger.error("ChatService", "Failed to generate AI response", { error });
            throw error;
        }
    }

    /*** Render message to handwriting preview */
    async renderMessagePreview(
        messageId: Schema.Types.ObjectId,
        text: string,
        handwritingProfile: IHandwritingSnapshot,
        customizations: {
            inkColor: string;
            fontSize: number;
            lineSpacing: number;
            marginLeft: number;
            marginTop: number;
        },
        paperStyle: "lined" | "plain" | "college_ruled"
    ): Promise<string> {
        try {
            console_util.verbose("ChatService", "Rendering message preview");

            const canvasDataUrl = await renderingService.renderTextToCanvas({
                text,
                handwritingProfile,
                customizations,
                paperStyle,
                width: 800,
                height: 600,
            });

            /*** Update message with preview */
            await this.ChatMessageModel.findByIdAndUpdate(messageId, {
                $set: {
                    "handwritingRenderData.canvasDataUrl": canvasDataUrl,
                    "handwritingRenderData.publishedAt": new Date(),
                },
            });

            logger.info("ChatService", "Message preview rendered", { messageId });

            return canvasDataUrl;
        } catch (error) {
            logger.error("ChatService", "Failed to render preview", { error });
            throw error;
        }
    }

    /*** Generate final PDF */
    async generateChatPdf(
        chatSessionId: Schema.Types.ObjectId,
        userId: Schema.Types.ObjectId,
        customizations: {
            inkColor: string;
            fontSize: number;
            lineSpacing: number;
            marginLeft: number;
            marginTop: number;
        },
        paperStyle: "lined" | "plain" | "college_ruled"
    ): Promise<{
        pdfUrl: string;
        pdfPublicId: string;
        fileSize: number;
    }> {
        try {
            console_util.verbose("ChatService", "Starting PDF generation...");

            const session = await this.ChatSessionModel.findById(
                chatSessionId
            ).populate("messages");
            if (!session) {
                throw new NotFoundError("Chat session");
            }

            /*** Prepare messages for PDF */
            const messages = (session.messages as unknown as IChatMessage[]).map(
                (msg) => ({
                    type: msg.type,
                    content: msg.content,
                    canvasDataUrl: msg.handwritingRenderData?.canvasDataUrl,
                })
            );

            /*** Generate PDF */
            const pdfBuffer = await renderingService.generatePdfFromMessages(
                messages,
                customizations,
                paperStyle
            );

            /*** Upload to Cloudinary */
            const fileName = `${chatSessionId}_${Date.now()}.pdf`;
            const { url, publicId, fileSize } = await cloudinaryService.uploadPdf(
                pdfBuffer,
                fileName,
                userId.toString()
            );

            /*** Update session */
            await this.ChatSessionModel.findByIdAndUpdate(chatSessionId, {
                $set: {
                    pdfUrl: url,
                    pdfPublicId: publicId,
                    pdfGeneratedAt: new Date(),
                },
            });

            logger.info("ChatService", "PDF generated and uploaded", {
                chatSessionId,
                pdfUrl: url,
                fileSize,
            });

            console_util.success("ChatService", "PDF ready", {
                chatSessionId,
                size: fileSize,
            });

            return { pdfUrl: url, pdfPublicId: publicId, fileSize };
        } catch (error) {
            logger.error("ChatService", "Failed to generate PDF", { error });
            throw error;
        }
    }

    /*** Get chat session with messages */
    async getChatSession(
        chatSessionId: Schema.Types.ObjectId
    ): Promise<IChatSession> {
        try {
            const session = await this.ChatSessionModel.findById(chatSessionId)
                .populate("messages")
                .lean();

            if (!session) {
                throw new NotFoundError("Chat session");
            }

            return session;
        } catch (error) {
            logger.error("ChatService", "Failed to get chat session", { error });
            throw error;
        }
    }

    /*** Search chat sessions */
    async searchSessions(
        userId: Schema.Types.ObjectId,
        filters: IChatSearchFilters & {
            page: number;
            limit: number;
            sortBy: "createdAt" | "updatedAt" | "title";
            sortOrder: "asc" | "desc";
        }
    ): Promise<{
        sessions: IChatSession[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        try {
            const query: Record<string, unknown> = { user: userId };

            if (filters.status) {
                query.status = filters.status;
            }

            if (typeof filters.isStarred === "boolean") {
                query.isStarred = filters.isStarred;
            }

            if (filters.createdAfter) {
                query.createdAt = { $gte: filters.createdAfter };
            }

            if (filters.createdBefore) {
                if (query.createdAt) {
                    (query.createdAt as Record<string, unknown>).$lte = filters.createdBefore;
                } else {
                    query.createdAt = { $lte: filters.createdBefore };
                }
            }

            if (filters.searchQuery) {
                query.title = { $regex: filters.searchQuery, $options: "i" };
            }

            const skip = (filters.page - 1) * filters.limit;
            const sortObj: Record<string, 1 | -1> = {};
            sortObj[filters.sortBy] = filters.sortOrder === "asc" ? 1 : -1;

            const total = await this.ChatSessionModel.countDocuments(query);
            const sessions = await this.ChatSessionModel.find(query)
                .sort(sortObj)
                .skip(skip)
                .limit(filters.limit)
                .lean();

            const totalPages = Math.ceil(total / filters.limit);

            logger.info("ChatService", "Sessions searched", {
                userId,
                total,
                page: filters.page,
            });

            return { sessions, total, page: filters.page, limit: filters.limit, totalPages };
        } catch (error) {
            logger.error("ChatService", "Search failed", { error });
            throw error;
        }
    }

    /*** Get chat statistics */
    async getStats(userId: Schema.Types.ObjectId): Promise<IChatStats> {
        try {
            const totalSessions = await this.ChatSessionModel.countDocuments({
                user: userId,
            });
            const activeSessions = await this.ChatSessionModel.countDocuments({
                user: userId,
                status: "active",
            });
            const archivedSessions = await this.ChatSessionModel.countDocuments({
                user: userId,
                status: "archived",
            });
            const totalMessages = await this.ChatMessageModel.countDocuments({
                chatSession: {
                    $in: await this.ChatSessionModel.find({ user: userId }).select("_id"),
                },
            });

            const averageMessagesPerSession =
                totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0;

            const totalPdfsGenerated = await this.ChatSessionModel.countDocuments({
                user: userId,
                pdfUrl: { $ne: null },
            });

            return {
                totalSessions,
                activeSessions,
                archivedSessions,
                totalMessages,
                averageMessagesPerSession,
                totalPdfsGenerated,
            };
        } catch (error) {
            logger.error("ChatService", "Failed to get stats", { error });
            throw error;
        }
    }

    /*** Update chat session */
    async updateSession(
        chatSessionId: Schema.Types.ObjectId,
        updates: {
            title?: string;
            status?: "active" | "archived" | "deleted";
            isStarred?: boolean;
        }
    ): Promise<IChatSession> {
        try {
            const session = await this.ChatSessionModel.findByIdAndUpdate(
                chatSessionId,
                { $set: updates },
                { new: true }
            );

            if (!session) {
                throw new NotFoundError("Chat session");
            }

            logger.info("ChatService", "Session updated", {
                chatSessionId,
                updates,
            });

            return session;
        } catch (error) {
            logger.error("ChatService", "Failed to update session", { error });
            throw error;
        }
    }

    /*** Delete chat session */
    async deleteSession(
        chatSessionId: Schema.Types.ObjectId,
        hardDelete: boolean = false
    ): Promise<boolean> {
        try {
            const session = await this.ChatSessionModel.findById(chatSessionId);
            if (!session) {
                throw new NotFoundError("Chat session");
            }

            if (hardDelete) {
                /*** Delete from Cloudinary */
                if (session.pdfPublicId) {
                    await cloudinaryService.deleteResource(session.pdfPublicId);
                }

                /*** Delete all messages */
                await this.ChatMessageModel.deleteMany({
                    chatSession: chatSessionId,
                });

                /*** Delete session */
                await this.ChatSessionModel.findByIdAndDelete(chatSessionId);
            } else {
                /*** Soft delete */
                await this.ChatSessionModel.findByIdAndUpdate(chatSessionId, {
                    $set: { status: "deleted" },
                });
            }

            logger.info("ChatService", "Session deleted", {
                chatSessionId,
                hardDelete,
            });

            return true;
        } catch (error) {
            logger.error("ChatService", "Failed to delete session", { error });
            throw error;
        }
    }
}

export const createChatService = (
    ChatSessionModel: Model<IChatSession>,
    ChatMessageModel: Model<IChatMessage>
): ChatService => {
    return new ChatService(ChatSessionModel, ChatMessageModel);
};