import { Request, Response, NextFunction } from "express";
import { Model, Schema } from "mongoose";
import {
    IChatSession,
    IChatMessage,
    IChatSessionResponse,
    IChatMessageResponse,
} from "../../types/core/chat.types";
import {
    CreateChatSessionSchema,
    GenerateAiResponseSchema,
    CanvasRenderSchema,
    PdfExportSchema,
    UpdateChatSessionSchema,
    ChatSearchSchema,
} from "../../validators/core/chat.validator";
import { createChatService } from "../../services/chat/chat.service";
import { createProfileService } from "../../services/profile/profile.service";
import {
    ValidationError,
    NotFoundError,
    UnauthorizedError,
} from "../../utils/error.util";
import { logger } from "../../utils/logger.util";
import { console_util } from "../../utils/console.util";
import { catchAsync } from "../../utils/error.util";

/*** Chat Controller */
export class ChatController {
    private chatService;
    private profileService;

    constructor(
        ChatSessionModel: Model<IChatSession>,
        ChatMessageModel: Model<IChatMessage>,
        ProfileModel: any
    ) {
        this.chatService = createChatService(ChatSessionModel, ChatMessageModel);
        this.profileService = createProfileService(ProfileModel);
    }

    /*** POST /api/chat/session - Create new chat session */
    createSession = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const { title } = CreateChatSessionSchema.parse(req.body);
            const userId = req.user?.id as string;

            if (!userId) {
                throw new UnauthorizedError("User ID not found");
            }

            /*** Get user's handwriting profile */
            const profile = await this.profileService.getProfile(
                new Schema.Types.ObjectId(userId)
            );
            if (!profile?.handwritingImage) {
                throw new ValidationError("Handwriting profile not found. Please upload first.");
            }

            /*** Extract handwriting characteristics (would use Claude Vision) */
            const handwritingSnapshot = {
                imageUrl: profile.handwritingImage.url,
                publicId: profile.handwritingImage.publicId,
                extractedStyles: {
                    slant: 0.15,
                    spacing: 1.2,
                    strokeWeight: 0.9,
                    lineIrregularity: 0.08,
                    inkDensity: 0.85,
                },
            };

            const session = await this.chatService.createChatSession(
                new Schema.Types.ObjectId(userId),
                title,
                handwritingSnapshot
            );

            const response: IChatSessionResponse = {
                id: session._id.toString(),
                title: session.title,
                messageCount: 0,
                pdfUrl: session.pdfUrl,
                isStarred: session.isStarred,
                status: session.status,
                lastMessageAt: session.updatedAt,
                createdAt: session.createdAt,
            };

            console_util.success("ChatController", "Session created", {
                sessionId: session._id,
            });

            res.status(201).json({
                success: true,
                data: response,
            });
        }
    );

    /*** POST /api/chat/:sessionId/message - Add message and generate response */
    sendMessage = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const { chatSessionId, userQuestion } = GenerateAiResponseSchema.parse({
                chatSessionId: req.params.sessionId,
                userQuestion: req.body.question,
            });

            const userId = req.user?.id as string;

            /*** Verify session belongs to user */
            const session = await this.chatService.getChatSession(
                new Schema.Types.ObjectId(chatSessionId)
            );

            if (session.user.toString() !== userId) {
                throw new UnauthorizedError("Not authorized to access this session");
            }

            /*** Add user question */
            const userMsg = await this.chatService.addUserQuestion(
                new Schema.Types.ObjectId(chatSessionId),
                userQuestion
            );

            /*** Generate AI response */
            const aiMsg = await this.chatService.generateAiResponse(
                new Schema.Types.ObjectId(chatSessionId),
                userQuestion
            );

            const messages: IChatMessageResponse[] = [
                {
                    id: userMsg._id.toString(),
                    chatSessionId: userMsg.chatSession.toString(),
                    type: "user_question",
                    content: userMsg.content,
                    order: userMsg.order,
                    metadata: {
                        timestamp: userMsg.metadata.timestamp,
                    },
                },
                {
                    id: aiMsg._id.toString(),
                    chatSessionId: aiMsg.chatSession.toString(),
                    type: "ai_answer",
                    content: aiMsg.content,
                    order: aiMsg.order,
                    metadata: {
                        timestamp: aiMsg.metadata.timestamp,
                        processingTimeMs: aiMsg.metadata.processingTimeMs,
                    },
                },
            ];

            res.status(200).json({
                success: true,
                data: messages,
            });
        }
    );

    /*** POST /api/chat/:messageId/preview - Render message preview */
    renderPreview = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const { customizations, paperStyle } = CanvasRenderSchema.parse(
                req.body
            );
            const messageId = req.params.messageId;

            const session = await this.chatService.getChatSession(
                new Schema.Types.ObjectId(req.body.chatSessionId)
            );

            const userId = req.user?.id as string;
            if (session.user.toString() !== userId) {
                throw new UnauthorizedError("Not authorized");
            }

            /*** Find message */
            const messages = session.messages as any;
            const message = messages.find((m: any) => m._id.toString() === messageId);
            if (!message) {
                throw new NotFoundError("Message");
            }

            /*** Render preview */
            const canvasDataUrl = await this.chatService.renderMessagePreview(
                new Schema.Types.ObjectId(messageId),
                message.content,
                session.handwritingProfileSnapshot,
                customizations,
                paperStyle
            );

            res.status(200).json({
                success: true,
                data: {
                    messageId,
                    previewImageUrl: canvasDataUrl,
                },
            });
        }
    );

    /*** POST /api/chat/:sessionId/export - Generate and export PDF */
    exportPdf = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const { chatSessionId, customizations, paperStyle } =
                PdfExportSchema.parse({
                    chatSessionId: req.params.sessionId,
                    ...req.body,
                });

            const userId = req.user?.id as string;
            const session = await this.chatService.getChatSession(
                new Schema.Types.ObjectId(chatSessionId)
            );

            if (session.user.toString() !== userId) {
                throw new UnauthorizedError("Not authorized");
            }

            /*** Generate PDF */
            const { pdfUrl, pdfPublicId, fileSize } =
                await this.chatService.generateChatPdf(
                    new Schema.Types.ObjectId(chatSessionId),
                    new Schema.Types.ObjectId(userId),
                    customizations,
                    paperStyle
                );

            res.status(200).json({
                success: true,
                data: {
                    pdfUrl,
                    pdfPublicId,
                    fileSize,
                    message: "PDF generated successfully",
                },
            });
        }
    );

    /*** GET /api/chat/:sessionId - Get single session */
    getSession = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;
            const session = await this.chatService.getChatSession(
                new Schema.Types.ObjectId(req.params.sessionId)
            );

            if (session.user.toString() !== userId) {
                throw new UnauthorizedError("Not authorized");
            }

            const messageCount = (session.messages as any[]).length;
            const response: IChatSessionResponse = {
                id: session._id.toString(),
                title: session.title,
                messageCount,
                pdfUrl: session.pdfUrl,
                isStarred: session.isStarred,
                status: session.status,
                lastMessageAt: session.updatedAt,
                createdAt: session.createdAt,
            };

            res.status(200).json({
                success: true,
                data: response,
            });
        }
    );

    /*** GET /api/chat - List sessions with search/filter */
    listSessions = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const filters = ChatSearchSchema.parse(req.query);
            const userId = req.user?.id as string;

            const result = await this.chatService.searchSessions(
                new Schema.Types.ObjectId(userId),
                {
                    ...filters,
                    searchQuery: filters.query,
                }
            );

            const sessions: IChatSessionResponse[] = (result.sessions as any[]).map(
                (session) => ({
                    id: session._id.toString(),
                    title: session.title,
                    messageCount: (session.messages || []).length,
                    pdfUrl: session.pdfUrl,
                    isStarred: session.isStarred,
                    status: session.status,
                    lastMessageAt: session.updatedAt,
                    createdAt: session.createdAt,
                })
            );

            res.status(200).json({
                success: true,
                data: sessions,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            });
        }
    );

    /*** PATCH /api/chat/:sessionId - Update session */
    updateSession = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const updates = UpdateChatSessionSchema.parse(req.body);
            const userId = req.user?.id as string;

            const session = await this.chatService.getChatSession(
                new Schema.Types.ObjectId(req.params.sessionId)
            );

            if (session.user.toString() !== userId) {
                throw new UnauthorizedError("Not authorized");
            }

            const updated = await this.chatService.updateSession(
                new Schema.Types.ObjectId(req.params.sessionId),
                updates
            );

            const response: IChatSessionResponse = {
                id: updated._id.toString(),
                title: updated.title,
                messageCount: (updated.messages as any[]).length,
                pdfUrl: updated.pdfUrl,
                isStarred: updated.isStarred,
                status: updated.status,
                lastMessageAt: updated.updatedAt,
                createdAt: updated.createdAt,
            };

            res.status(200).json({
                success: true,
                data: response,
            });
        }
    );

    /*** DELETE /api/chat/:sessionId - Delete session */
    deleteSession = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;
            const hardDelete = req.query.hard === "true";

            const session = await this.chatService.getChatSession(
                new Schema.Types.ObjectId(req.params.sessionId)
            );

            if (session.user.toString() !== userId) {
                throw new UnauthorizedError("Not authorized");
            }

            await this.chatService.deleteSession(
                new Schema.Types.ObjectId(req.params.sessionId),
                hardDelete
            );

            res.status(200).json({
                success: true,
                message: hardDelete
                    ? "Chat session permanently deleted"
                    : "Chat session deleted",
            });
        }
    );

    /*** GET /api/chat/stats - Get user chat statistics */
    getStats = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;
            const stats = await this.chatService.getStats(new Schema.Types.ObjectId(userId));

            res.status(200).json({
                success: true,
                data: stats,
            });
        }
    );
}