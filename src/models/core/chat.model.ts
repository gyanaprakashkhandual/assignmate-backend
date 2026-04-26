import { model } from "mongoose";
import {
    ChatSessionSchema,
    ChatMessageSchema,
    PdfGenerationRecordSchema,
} from "../../schemas/core/chat.schema";
import { IChatSession, IChatMessage, IPdfGenerationRecord } from "../../types/core/chat.types";

/*** Models */
export const ChatSessionModel = model<IChatSession>(
    "ChatSession",
    ChatSessionSchema
);

export const ChatMessageModel = model<IChatMessage>(
    "ChatMessage",
    ChatMessageSchema
);

export const PdfGenerationRecordModel = model<IPdfGenerationRecord>(
    "PdfGenerationRecord",
    PdfGenerationRecordSchema
);

/*** Exports */
export { ChatSessionSchema, ChatMessageSchema, PdfGenerationRecordSchema };
export * from "../../types/core/chat.types";