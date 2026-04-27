import { Request, Response, NextFunction } from "express";
import { Model, Types } from "mongoose";
import { IChatMessage, IChatSession } from "../../types/core/chat.types";
import { UnauthorizedError, NotFoundError } from "../../utils/error.util";
import { catchAsync } from "../../utils/error.util";

export class MessageController {
    constructor(
        private ChatMessageModel: Model<IChatMessage>,
        private ChatSessionModel: Model<IChatSession>
    ) {}

    private async assertSessionOwnership(sessionId: string, userId: string): Promise<IChatSession> {
        const session = await this.ChatSessionModel.findById(sessionId).lean();
        if (!session) throw new NotFoundError("Chat session");
        if (session.user.toString() !== userId) throw new UnauthorizedError("Not authorized");
        return session as IChatSession;
    }

    private formatMessage(msg: IChatMessage) {
        return {
            id: msg._id.toString(),
            chatSessionId: msg.chatSession.toString(),
            type: msg.type,
            content: msg.content,
            order: msg.order,
            metadata: {
                messageId: msg.metadata.messageId,
                timestamp: msg.metadata.timestamp,
                processingTimeMs: msg.metadata.processingTimeMs,
                tokensUsed: msg.metadata.tokensUsed,
                model: msg.metadata.model,
            },
            handwritingRenderData: msg.handwritingRenderData ?? null,
            createdAt: msg.createdAt,
        };
    }

    getMessagesBySession = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;
            const { sessionId } = req.params;

            await this.assertSessionOwnership(sessionId as string, userId);

            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
            const skip = (page - 1) * limit;
            const type = req.query.type as string | undefined;

            const filter: Record<string, unknown> = {
                chatSession: new Types.ObjectId(sessionId as string),
            };
            if (type === "user_question" || type === "ai_answer") {
                filter.type = type;
            }

            const [messages, total] = await Promise.all([
                this.ChatMessageModel.find(filter)
                    .sort({ order: 1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                this.ChatMessageModel.countDocuments(filter),
            ]);

            res.status(200).json({
                success: true,
                data: messages.map(m => this.formatMessage(m as IChatMessage)),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }
    );

    getMessageById = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;
            const { messageId } = req.params;

            const message = await this.ChatMessageModel.findById(messageId).lean();
            if (!message) throw new NotFoundError("Message");

            await this.assertSessionOwnership(message.chatSession.toString(), userId);

            res.status(200).json({
                success: true,
                data: this.formatMessage(message as IChatMessage),
            });
        }
    );

    deleteMessage = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;
            const { messageId } = req.params;

            const message = await this.ChatMessageModel.findById(messageId).lean();
            if (!message) throw new NotFoundError("Message");

            await this.assertSessionOwnership(message.chatSession.toString(), userId);

            await Promise.all([
                this.ChatMessageModel.findByIdAndDelete(messageId),
                this.ChatSessionModel.findByIdAndUpdate(message.chatSession, {
                    $pull: { messages: new Types.ObjectId(messageId as string) },
                }),
            ]);

            res.status(200).json({ success: true, message: "Message deleted" });
        }
    );
}