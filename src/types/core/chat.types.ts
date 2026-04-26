import { Document, Types } from "mongoose";

export interface IChatSession extends Document {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    title: string;
    messages: Types.ObjectId[];
    pdfUrl?: string;
    pdfPublicId?: string;
    pdfGeneratedAt?: Date;
    handwritingProfileSnapshot: IHandwritingSnapshot;
    status: "active" | "archived" | "deleted";
    isStarred: boolean;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}

export interface IChatMessage extends Document {
    _id: Types.ObjectId;
    chatSession: Types.ObjectId;
    type: "user_question" | "ai_answer";
    content: string;
    order: number;
    metadata: {
        messageId: string;
        timestamp: Date;
        processingTimeMs?: number;
        tokensUsed?: number;
        model?: string;
    };
    handwritingRenderData?: {
        canvasDataUrl?: string;
        previewImageUrl?: string;
        publishedAt?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface IPdfGenerationRecord extends Document {
    _id: Types.ObjectId;
    chatSession: Types.ObjectId;
    user: Types.ObjectId;
    pdfUrl: string;
    pdfPublicId: string;
    messageCount: number;
    fileSize: number;
    generatedAt: Date;
    exportedBy: "auto" | "manual";
    metadata: {
        canvasWidth: number;
        canvasHeight: number;
        pageCount: number;
        paperStyle: string;
        customizations: Record<string, unknown>;
    };
}

export interface IChatSearchFilters {
    userId?: Types.ObjectId;
    status?: "active" | "archived" | "deleted";
    isStarred?: boolean;
    createdAfter?: Date;
    createdBefore?: Date;
    hasMessages?: boolean;
    searchQuery?: string;
}

export interface IChatStats {
    totalSessions: number;
    activeSessions: number;
    archivedSessions: number;
    totalMessages: number;
    averageMessagesPerSession: number;
    totalPdfsGenerated: number;
}

export interface IHandwritingSnapshot {
    imageUrl: string;
    publicId: string;
    extractedStyles: {
        slant: number;
        spacing: number;
        strokeWeight: number;
        lineIrregularity: number;
        inkDensity: number;
        fontFamily?: string;
        fontSize?: number;
        extraData?: Record<string, unknown>;
    };
}

export interface ICanvasRenderRequest {
    text: string;
    handwritingProfile: IHandwritingSnapshot;
    paperStyle: "lined" | "plain" | "college_ruled";
    customizations: {
        inkColor: string;
        fontSize: number;
        lineSpacing: number;
        marginLeft: number;
        marginTop: number;
    };
    width: number;
    height: number;
}

export interface IPdfExportRequest {
    chatSessionId: string;
    paperStyle: "lined" | "plain" | "college_ruled";
    customizations: {
        inkColor: string;
        fontSize: number;
        lineSpacing: number;
        marginLeft: number;
        marginTop: number;
    };
}

export interface IChatMessageResponse {
    id: string;
    chatSessionId: string;
    type: "user_question" | "ai_answer";
    content: string;
    order: number;
    previewImageUrl?: string;
    metadata: {
        timestamp: Date;
        processingTimeMs?: number;
    };
}

export interface IChatSessionResponse {
    id: string;
    title: string;
    messageCount: number;
    pdfUrl?: string;
    isStarred: boolean;
    status: "active" | "archived" | "deleted";
    lastMessageAt: Date;
    createdAt: Date;
}