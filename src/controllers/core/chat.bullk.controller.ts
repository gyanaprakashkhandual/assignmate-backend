import { Request, Response, NextFunction } from "express";
import { Model, Types } from "mongoose";
import { IChatMessage, IChatSession, IPdfGenerationRecord } from "../../types/core/chat.types";
import { UnauthorizedError, NotFoundError } from "../../utils/error.util";
import { catchAsync } from "../../utils/error.util";

export class ChatBulkController {
    constructor(
        private ChatSessionModel: Model<IChatSession>,
        private ChatMessageModel: Model<IChatMessage>,
        private PdfGenerationRecordModel: Model<IPdfGenerationRecord>
    ) { }

    private async resolveSessionIds(userId: string, sessionIds?: string[]): Promise<Types.ObjectId[]> {
        if (sessionIds && sessionIds.length > 0) {
            const sessions = await this.ChatSessionModel.find({
                _id: { $in: sessionIds.map((id) => new Types.ObjectId(id)) },
                user: new Types.ObjectId(userId),
            }).select("_id");
            return sessions.map((s) => s._id as Types.ObjectId);
        }
        const sessions = await this.ChatSessionModel.find({
            user: new Types.ObjectId(userId),
        }).select("_id");
        return sessions.map((s) => s._id as Types.ObjectId);
    }

    deleteAllSessions = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;
            const sessionIds: string[] | undefined = req.body.sessionIds;

            const resolvedIds = await this.resolveSessionIds(userId, sessionIds);
            if (resolvedIds.length === 0) {
                res.status(200).json({ success: true, message: "No sessions to delete", deleted: 0 });
                return;
            }

            await this.ChatSessionModel.updateMany(
                { _id: { $in: resolvedIds } },
                { status: "deleted" }
            );

            res.status(200).json({
                success: true,
                message: "Sessions moved to deleted",
                deleted: resolvedIds.length,
            });
        }
    );

    deleteAllSessionsPermanently = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;
            const sessionIds: string[] | undefined = req.body.sessionIds;

            const resolvedIds = await this.resolveSessionIds(userId, sessionIds);
            if (resolvedIds.length === 0) {
                res.status(200).json({ success: true, message: "No sessions to delete", deleted: 0 });
                return;
            }

            await Promise.all([
                this.ChatMessageModel.deleteMany({ chatSession: { $in: resolvedIds } }),
                this.ChatSessionModel.deleteMany({ _id: { $in: resolvedIds } }),
                this.PdfGenerationRecordModel.deleteMany({ chatSession: { $in: resolvedIds } }),
            ]);

            res.status(200).json({
                success: true,
                message: "Sessions and all associated data permanently deleted",
                deleted: resolvedIds.length,
            });
        }
    );

    archiveAllSessions = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;
            const sessionIds: string[] | undefined = req.body.sessionIds;

            const resolvedIds = await this.resolveSessionIds(userId, sessionIds);
            if (resolvedIds.length === 0) {
                res.status(200).json({ success: true, message: "No sessions to archive", archived: 0 });
                return;
            }

            await this.ChatSessionModel.updateMany(
                { _id: { $in: resolvedIds } },
                { status: "archived" }
            );

            res.status(200).json({
                success: true,
                message: "Sessions archived",
                archived: resolvedIds.length,
            });
        }
    );

    filterSessions = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
            const skip = (page - 1) * limit;

            const status = req.query.status as string | undefined;
            const isStarredRaw = req.query.isStarred as string | undefined;
            const sortBy = (req.query.sortBy as string) || "createdAt";
            const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
            const fromDate = req.query.from ? new Date(req.query.from as string) : undefined;
            const toDate = req.query.to ? new Date(req.query.to as string) : undefined;

            const filter: Record<string, unknown> = { user: new Types.ObjectId(userId) };

            if (status && ["active", "archived", "deleted"].includes(status)) {
                filter.status = status;
            }
            if (isStarredRaw !== undefined) {
                filter.isStarred = isStarredRaw === "true";
            }
            if (fromDate || toDate) {
                const dateRange: Record<string, Date> = {};
                if (fromDate) dateRange.$gte = fromDate;
                if (toDate) dateRange.$lte = toDate;
                filter.createdAt = dateRange;
            }

            const allowedSortFields = ["createdAt", "updatedAt", "title"];
            const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

            const [sessions, total] = await Promise.all([
                this.ChatSessionModel.find(filter)
                    .sort({ [safeSortBy]: sortOrder })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                this.ChatSessionModel.countDocuments(filter),
            ]);

            res.status(200).json({
                success: true,
                data: sessions.map((s) => ({
                    id: s._id.toString(),
                    title: s.title,
                    status: s.status,
                    isStarred: s.isStarred,
                    messageCount: (s.messages || []).length,
                    pdfUrl: s.pdfUrl,
                    createdAt: s.createdAt,
                    lastMessageAt: s.updatedAt,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }
    );

    searchSessions = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;
            const query = (req.query.q as string)?.trim();
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
            const skip = (page - 1) * limit;

            if (!query) {
                res.status(400).json({ success: false, message: "Search query is required" });
                return;
            }

            const filter: Record<string, unknown> = {
                user: new Types.ObjectId(userId),
                status: { $ne: "deleted" },
                title: { $regex: query, $options: "i" },
            };

            const [sessions, total] = await Promise.all([
                this.ChatSessionModel.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                this.ChatSessionModel.countDocuments(filter),
            ]);

            res.status(200).json({
                success: true,
                data: sessions.map((s) => ({
                    id: s._id.toString(),
                    title: s.title,
                    status: s.status,
                    isStarred: s.isStarred,
                    messageCount: (s.messages || []).length,
                    pdfUrl: s.pdfUrl,
                    createdAt: s.createdAt,
                    lastMessageAt: s.updatedAt,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }
    );

    getUserPdfs = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
            const skip = (page - 1) * limit;

            const fromDate = req.query.from ? new Date(req.query.from as string) : undefined;
            const toDate = req.query.to ? new Date(req.query.to as string) : undefined;
            const exportedBy = req.query.exportedBy as string | undefined;
            const searchQuery = (req.query.q as string)?.trim();
            const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

            const filter: Record<string, unknown> = { user: new Types.ObjectId(userId) };

            if (fromDate || toDate) {
                const dateRange: Record<string, Date> = {};
                if (fromDate) dateRange.$gte = fromDate;
                if (toDate) dateRange.$lte = toDate;
                filter.generatedAt = dateRange;
            }
            if (exportedBy && ["auto", "manual"].includes(exportedBy)) {
                filter.exportedBy = exportedBy;
            }

            if (searchQuery) {
                const matchingSessions = await this.ChatSessionModel.find({
                    user: new Types.ObjectId(userId),
                    title: { $regex: searchQuery, $options: "i" },
                }).select("_id");
                filter.chatSession = { $in: matchingSessions.map((s) => s._id) };
            }

            const [records, total] = await Promise.all([
                this.PdfGenerationRecordModel.find(filter)
                    .sort({ generatedAt: sortOrder })
                    .skip(skip)
                    .limit(limit)
                    .populate("chatSession", "title status")
                    .lean(),
                this.PdfGenerationRecordModel.countDocuments(filter),
            ]);

            res.status(200).json({
                success: true,
                data: records.map((r) => ({
                    id: r._id.toString(),
                    pdfUrl: r.pdfUrl,
                    pdfPublicId: r.pdfPublicId,
                    fileSize: r.fileSize,
                    messageCount: r.messageCount,
                    exportedBy: r.exportedBy,
                    generatedAt: r.generatedAt,
                    chatSession: r.chatSession,
                    metadata: r.metadata,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }
    );
}