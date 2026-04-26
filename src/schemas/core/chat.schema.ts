import { Schema } from "mongoose";
import {
    IChatSession,
    IChatMessage,
    IPdfGenerationRecord,
    IHandwritingSnapshot,
} from "../../types/core/chat.types";

/*** Handwriting Snapshot Sub-schema */
const HandwritingSnapshotSchema = new Schema<IHandwritingSnapshot>(
    {
        imageUrl: {
            type: String,
            required: true,
        },
        publicId: {
            type: String,
            required: true,
        },
        extractedStyles: {
            slant: {
                type: Number,
                default: 0,
            },
            spacing: {
                type: Number,
                default: 1,
            },
            strokeWeight: {
                type: Number,
                default: 1,
            },
            lineIrregularity: {
                type: Number,
                default: 0.1,
            },
            inkDensity: {
                type: Number,
                default: 0.8,
            },
            fontFamily: String,
            fontSize: Number,
            extraData: Schema.Types.Mixed,
        },
    },
    { _id: false }
);

/*** Chat Session Schema */
export const ChatSessionSchema = new Schema<IChatSession>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        messages: {
            type: [{ type: Schema.Types.ObjectId, ref: "ChatMessage" }],
            default: [],
        },
        pdfUrl: {
            type: String,
            default: null,
        },
        pdfPublicId: {
            type: String,
            default: null,
        },
        pdfGeneratedAt: {
            type: Date,
            default: null,
        },
        handwritingProfileSnapshot: {
            type: HandwritingSnapshotSchema,
            required: true,
        },
        status: {
            type: String,
            enum: ["active", "archived", "deleted"],
            default: "active",
            index: true,
        },
        isStarred: {
            type: Boolean,
            default: false,
            index: true,
        },
        expiresAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

/*** Indexes */
ChatSessionSchema.index({ user: 1, status: 1 });
ChatSessionSchema.index({ user: 1, createdAt: -1 });
ChatSessionSchema.index({ user: 1, isStarred: 1 });
ChatSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/*** Chat Message Schema */
export const ChatMessageSchema = new Schema<IChatMessage>(
    {
        chatSession: {
            type: Schema.Types.ObjectId,
            ref: "ChatSession",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["user_question", "ai_answer"],
            required: true,
            index: true,
        },
        content: {
            type: String,
            required: true,
        },
        order: {
            type: Number,
            required: true,
        },
        metadata: {
            messageId: {
                type: String,
                required: true,
                unique: true,
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
            processingTimeMs: Number,
            tokensUsed: Number,
            model: {
                type: String,
                default: "claude-sonnet-4-20250514",
            },
        },
        handwritingRenderData: {
            canvasDataUrl: String,
            previewImageUrl: String,
            publishedAt: Date,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

/*** Indexes */
ChatMessageSchema.index({ chatSession: 1, order: 1 });
ChatMessageSchema.index({ chatSession: 1, type: 1 });
ChatMessageSchema.index({ "metadata.timestamp": -1 });

/*** PDF Generation Record Schema */
export const PdfGenerationRecordSchema = new Schema<IPdfGenerationRecord>(
    {
        chatSession: {
            type: Schema.Types.ObjectId,
            ref: "ChatSession",
            required: true,
            index: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        pdfUrl: {
            type: String,
            required: true,
        },
        pdfPublicId: {
            type: String,
            required: true,
        },
        messageCount: {
            type: Number,
            required: true,
        },
        fileSize: {
            type: Number,
            required: true,
        },
        generatedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        exportedBy: {
            type: String,
            enum: ["auto", "manual"],
            default: "manual",
        },
        metadata: {
            canvasWidth: Number,
            canvasHeight: Number,
            pageCount: Number,
            paperStyle: String,
            customizations: Schema.Types.Mixed,
        },
    },
    {
        timestamps: false,
        versionKey: false,
    }
);

/*** Indexes */
PdfGenerationRecordSchema.index({ user: 1, generatedAt: -1 });
PdfGenerationRecordSchema.index({ chatSession: 1 });