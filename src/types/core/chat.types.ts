import { Document, Schema } from "mongoose";

/*** Chat Session Document */
export interface IChatSession extends Document {
    user: Schema.Types.ObjectId;
    title: string;
    messages: Schema.Types.ObjectId[];
    pdfUrl?: string;
    pdfPublicId?: string;
    pdfGeneratedAt?: Date;
    handwritingProfileSnapshot: {
        imageUrl: string;
        publicId: string;
        extractedStyles: Record<string, unknown>;
    };
    status: "active" | "archived" | "deleted";
    isStarred: boolean;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}

/*** Individual Chat Message */
export interface IChatMessage extends Document {
    chatSession: Schema.Types.ObjectId;
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

/*** PDF Generation Record */
export interface IPdfGenerationRecord extends Document {
    chatSession: Schema.Types.ObjectId;
    user: Schema.Types.ObjectId;
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

/*** Chat Search Filter Options */
export interface IChatSearchFilters {
    userId?: Schema.Types.ObjectId;
    status?: "active" | "archived" | "deleted";
    isStarred?: boolean;
    createdAfter?: Date;
    createdBefore?: Date;
    hasMessages?: boolean;
    searchQuery?: string;
}

/*** Chat Statistics */
export interface IChatStats {
    totalSessions: number;
    activeSessions: number;
    archivedSessions: number;
    totalMessages: number;
    averageMessagesPerSession: number;
    totalPdfsGenerated: number;
}

/*** Handwriting Profile Snapshot (at time of chat) */
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

/*** Canvas Rendering Request */
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

/*** PDF Export Request */
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

/*** API Response Types */
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