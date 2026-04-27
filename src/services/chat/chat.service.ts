import { Model, Types } from "mongoose";
import {
    IChatSession,
    IChatMessage,
    IHandwritingSnapshot,
} from "../../types/core/chat.types";
import { openRouterService } from "../chat/openrouter.service";
import { handwritingPdfService, IPdfRenderOptions } from "../pdf/pdf.service";
import { cloudinaryService } from "../../services/cloudinary/cloudinary.service";
import { logger } from "../../utils/logger.util";
import { console_util } from "../../utils/console.util";
import { NotFoundError } from "../../utils/error.util";

export function createChatService(
    ChatSessionModel: Model<IChatSession>,
    ChatMessageModel: Model<IChatMessage>
) {
    // -------------------------------------------------------------------------
    // Session management
    // -------------------------------------------------------------------------

    async function createChatSession(
        userId: Types.ObjectId,
        title: string,
        handwritingSnapshot: IHandwritingSnapshot
    ): Promise<IChatSession> {
        const session = await ChatSessionModel.create({
            user: userId,
            title,
            messages: [],
            handwritingProfileSnapshot: handwritingSnapshot,
            status: "active",
            isStarred: false,
        });

        console_util.success("ChatService", "New chat session", {
            id: session._id,
            title: session.title,
        });

        return session;
    }

    async function getChatSession(
        sessionId: Types.ObjectId
    ): Promise<IChatSession> {
        const session = await ChatSessionModel.findById(sessionId).populate(
            "messages"
        );
        if (!session) throw new NotFoundError("Chat session");
        return session;
    }

    async function updateSession(
        sessionId: Types.ObjectId,
        updates: Partial<Pick<IChatSession, "title" | "isStarred" | "status">>
    ): Promise<IChatSession> {
        const session = await ChatSessionModel.findByIdAndUpdate(
            sessionId,
            { $set: updates },
            { new: true }
        ).populate("messages");
        if (!session) throw new NotFoundError("Chat session");
        return session;
    }

    async function deleteSession(
        sessionId: Types.ObjectId,
        hard = false
    ): Promise<void> {
        if (hard) {
            await ChatSessionModel.findByIdAndDelete(sessionId);
            await ChatMessageModel.deleteMany({ chatSession: sessionId });
        } else {
            await ChatSessionModel.findByIdAndUpdate(sessionId, {
                $set: { status: "deleted" },
            });
        }
    }

    // -------------------------------------------------------------------------
    // Messaging
    // -------------------------------------------------------------------------

    async function addUserQuestion(
        sessionId: Types.ObjectId,
        question: string
    ): Promise<IChatMessage> {
        const count = await ChatMessageModel.countDocuments({
            chatSession: sessionId,
        });

        const msg = await ChatMessageModel.create({
            chatSession: sessionId,
            type: "user_question",
            content: question,
            order: count,
            metadata: {
                messageId: new Types.ObjectId().toString(),
                timestamp: new Date(),
            },
        });

        await ChatSessionModel.findByIdAndUpdate(sessionId, {
            $push: { messages: msg._id },
        });

        return msg;
    }

    async function generateAiResponse(
        sessionId: Types.ObjectId,
        userQuestion: string
    ): Promise<IChatMessage> {
        console_util.verbose("ChatService", "Generating AI response...");

        const session = await getChatSession(sessionId);
        const snapshot = session.handwritingProfileSnapshot;

        // Build chat history from previous messages for context
        const previousMessages = (session.messages as any[])
            .filter((m) => m.type !== undefined)
            .map((m) => ({
                role: m.type === "user_question" ? ("user" as const) : ("assistant" as const),
                content: m.content as string,
            }));

        const { answer, tokensUsed, processingTimeMs } =
            await openRouterService.generateAssignmentAnswer(
                userQuestion,
                previousMessages,
                snapshot
            );

        const count = await ChatMessageModel.countDocuments({
            chatSession: sessionId,
        });

        const msg = await ChatMessageModel.create({
            chatSession: sessionId,
            type: "ai_answer",
            content: answer,
            order: count,
            metadata: {
                messageId: new Types.ObjectId().toString(),
                timestamp: new Date(),
                processingTimeMs,
                tokensUsed,
                model: "anthropic/claude-sonnet-4.5",
            },
        });

        await ChatSessionModel.findByIdAndUpdate(sessionId, {
            $push: { messages: msg._id },
        });

        console_util.success("ChatService", "AI response saved", {
            sessionId,
            tokensUsed,
            processingTimeMs,
        });

        return msg;
    }

    // -------------------------------------------------------------------------
    // Preview render (returns base64 data URL — used in frontend canvas)
    // -------------------------------------------------------------------------

    async function renderMessagePreview(
        _messageId: Types.ObjectId,
        content: string,
        handwritingSnapshot: IHandwritingSnapshot,
        customizations: IPdfRenderOptions["customizations"],
        paperStyle: IPdfRenderOptions["paperStyle"]
    ): Promise<string> {
        // For a single message preview we generate a 1-page PDF and return
        // it as a base64 data URL so the frontend can display it
        const { pdfBytes } = await handwritingPdfService.renderChatToPdf(
            [{ type: "ai_answer", content }],
            handwritingSnapshot,
            { paperStyle, customizations },
            (handwritingSnapshot.extractedStyles.extraData?.fontUrl as string) ?? undefined
        );

        const b64 = Buffer.from(pdfBytes).toString("base64");
        return `data:application/pdf;base64,${b64}`;
    }

    // -------------------------------------------------------------------------
    // Full PDF export
    // -------------------------------------------------------------------------

    async function generateChatPdf(
        sessionId: Types.ObjectId,
        userId: Types.ObjectId,
        customizations: IPdfRenderOptions["customizations"],
        paperStyle: IPdfRenderOptions["paperStyle"]
    ): Promise<{ pdfUrl: string; pdfPublicId: string; fileSize: number }> {
        console_util.verbose("ChatService", "Starting PDF generation", { sessionId });

        const session = await getChatSession(sessionId);
        const snapshot = session.handwritingProfileSnapshot;

        // ── Collect all messages in order ────────────────────────────────────
        const messages = (session.messages as any[])
            .sort((a, b) => a.order - b.order)
            .map((m) => ({
                type: m.type as "user_question" | "ai_answer",
                content: m.content as string,
            }));

        if (messages.length === 0) {
            throw new Error("No messages to export");
        }

        // ── Resolve the TTF font URL from extraData ──────────────────────────
        // The font URL is stored in extraData.fontUrl after Calligraphr upload.
        // If it's not present the PDF service falls back to a system font.
        const fontUrl =
            (snapshot.extractedStyles.extraData?.fontUrl as string) ?? undefined;

        // ── Render PDF ───────────────────────────────────────────────────────
        const { pdfBytes, pageCount, fileSize } =
            await handwritingPdfService.renderChatToPdf(
                messages,
                snapshot,
                { paperStyle, customizations },
                fontUrl
            );

        // ── Upload to Cloudinary ─────────────────────────────────────────────
        const { url, publicId } = await cloudinaryService.uploadPdfBuffer(
            Buffer.from(pdfBytes),
            {
                folder: `assignmate/pdfs/${userId}`,
                publicId: `session_${sessionId}_${Date.now()}`,
            }
        );

        // ── Persist URL on the session ───────────────────────────────────────
        await ChatSessionModel.findByIdAndUpdate(sessionId, {
            $set: {
                pdfUrl: url,
                pdfPublicId: publicId,
                pdfGeneratedAt: new Date(),
            },
        });

        logger.info("ChatService", "PDF exported", {
            sessionId,
            pageCount,
            fileSize,
            url,
        });

        console_util.success("ChatService", "PDF uploaded to Cloudinary", { url });

        return { pdfUrl: url, pdfPublicId: publicId, fileSize };
    }

    // -------------------------------------------------------------------------
    // Search & stats
    // -------------------------------------------------------------------------

    async function searchSessions(
        userId: Types.ObjectId,
        filters: {
            status?: IChatSession["status"];
            isStarred?: boolean;
            searchQuery?: string;
            page?: number;
            limit?: number;
        }
    ) {
        const query: Record<string, unknown> = { user: userId };

        if (filters.status) query.status = filters.status;
        if (filters.isStarred !== undefined) query.isStarred = filters.isStarred;
        if (filters.searchQuery) {
            query.title = { $regex: filters.searchQuery, $options: "i" };
        }

        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const skip = (page - 1) * limit;

        const [sessions, total] = await Promise.all([
            ChatSessionModel.find(query)
                .populate("messages")
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit),
            ChatSessionModel.countDocuments(query),
        ]);

        return {
            sessions,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    async function getStats(userId: Types.ObjectId) {
        const [sessions, totalMessages, pdfs] = await Promise.all([
            ChatSessionModel.find({ user: userId }),
            ChatMessageModel.countDocuments({
                chatSession: {
                    $in: await ChatSessionModel.find({ user: userId }).distinct(
                        "_id"
                    ),
                },
            }),
            ChatSessionModel.countDocuments({ user: userId, pdfUrl: { $exists: true } }),
        ]);

        const active = sessions.filter((s) => s.status === "active").length;
        const archived = sessions.filter((s) => s.status === "archived").length;

        return {
            totalSessions: sessions.length,
            activeSessions: active,
            archivedSessions: archived,
            totalMessages,
            averageMessagesPerSession:
                sessions.length > 0 ? totalMessages / sessions.length : 0,
            totalPdfsGenerated: pdfs,
        };
    }

    return {
        createChatSession,
        getChatSession,
        updateSession,
        deleteSession,
        addUserQuestion,
        generateAiResponse,
        renderMessagePreview,
        generateChatPdf,
        searchSessions,
        getStats,
    };
}