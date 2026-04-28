import { z } from "zod";

/*** Create Chat Session Request */
export const CreateChatSessionSchema = z.object({
    title: z
        .string()
        .trim()
        .min(3, "Title must be at least 3 characters")
        .max(200, "Title must not exceed 200 characters"),
});

/*** Add Message to Chat Request */
export const AddChatMessageSchema = z.object({
    chatSessionId: z
        .string()
        .regex(/^[0-9a-f]{24}$/, "Invalid chat session ID"),
    content: z
        .string()
        .trim()
        .min(3, "Message must be at least 3 characters")
        .max(5000, "Message must not exceed 5000 characters"),
    type: z.enum(["user_question", "ai_answer"]).default("user_question"),
});

/*** Generate AI Response Request */
export const GenerateAiResponseSchema = z.object({
    chatSessionId: z
        .string()
        .regex(/^[0-9a-f]{24}$/, "Invalid chat session ID"),
    userQuestion: z
        .string()
        .trim()
        .min(3, "Question must be at least 3 characters")
        .max(5000, "Question must not exceed 5000 characters"),
});

/*** Canvas Render Request */
export const CanvasRenderSchema = z.object({
    text: z
        .string()
        .trim()
        .min(1, "Text required for rendering"),
    messageId: z.string().regex(/^[0-9a-f]{24}$/, "Invalid message ID"),
    paperStyle: z.enum(["lined", "plain", "college_ruled"]).default("lined"),
    customizations: z
        .object({
            inkColor: z
                .string()
                .regex(/^#[0-9a-f]{6}$/i, "Invalid hex color")
                .default("#000000"),
            fontSize: z.number().min(8, "Font size minimum 8").max(32).default(14),
            lineSpacing: z.number().min(1, "Line spacing minimum 1").max(3).default(1.5),
            marginLeft: z.number().min(0).max(100).default(20),
            marginTop: z.number().min(0).max(100).default(20),
        })
        .default({
            inkColor: "#000000",
            fontSize: 14,
            lineSpacing: 1.5,
            marginLeft: 20,
            marginTop: 20,
        }),
});

/*** PDF Export Request */
export const PdfExportSchema = z.object({
    chatSessionId: z
        .string()
        .regex(/^[0-9a-f]{24}$/, "Invalid chat session ID"),
    paperStyle: z.enum(["lined", "plain", "college_ruled"]).default("lined"),
    customizations: z
        .object({
            inkColor: z
                .string()
                .regex(/^#[0-9a-f]{6}$/i, "Invalid hex color")
                .default("#000000"),
            fontSize: z.number().min(8).max(32).default(14),
            lineSpacing: z.number().min(1).max(3).default(1.5),
            marginLeft: z.number().min(0).max(100).default(20),
            marginTop: z.number().min(0).max(100).default(20),
        })
        .default({
            inkColor: "#000000",
            fontSize: 14,
            lineSpacing: 1.5,
            marginLeft: 20,
            marginTop: 20,
        }),
});

/*** Chat Session Update Request */
export const UpdateChatSessionSchema = z.object({
    title: z
        .string()
        .trim()
        .min(3)
        .max(200)
        .optional(),
    status: z.enum(["active", "archived", "deleted"]).optional(),
    isStarred: z.boolean().optional(),
});

/*** Chat Search Query */
export const ChatSearchSchema = z.object({
    query: z.string().trim().optional(),
    status: z.enum(["active", "archived", "deleted"]).optional(),
    isStarred: z.preprocess(
        (val) => (val === "true" ? true : val === "false" ? false : val),
        z.boolean().optional()
    ),
    sortBy: z.enum(["createdAt", "updatedAt", "title"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    page: z.preprocess((val) => {
        const parsed = parseInt(val as string, 10);
        return isNaN(parsed) ? 1 : parsed;
    }, z.number().min(1).default(1)),
    limit: z.preprocess((val) => {
        const parsed = parseInt(val as string, 10);
        return isNaN(parsed) ? 20 : parsed;
    }, z.number().min(1).max(100).default(20)),
});

/*** Pagination Query */
export const PaginationSchema = z.object({
    page: z.preprocess((val) => {
        const parsed = parseInt(val as string, 10);
        return isNaN(parsed) ? 1 : parsed;
    }, z.number().min(1).default(1)),
    limit: z.preprocess((val) => {
        const parsed = parseInt(val as string, 10);
        return isNaN(parsed) ? 20 : parsed;
    }, z.number().min(1).max(100).default(20)),
});

/*** Type exports */
export type CreateChatSessionInput = z.infer<typeof CreateChatSessionSchema>;
export type AddChatMessageInput = z.infer<typeof AddChatMessageSchema>;
export type GenerateAiResponseInput = z.infer<typeof GenerateAiResponseSchema>;
export type CanvasRenderInput = z.infer<typeof CanvasRenderSchema>;
export type PdfExportInput = z.infer<typeof PdfExportSchema>;
export type UpdateChatSessionInput = z.infer<typeof UpdateChatSessionSchema>;
export type ChatSearchInput = z.infer<typeof ChatSearchSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;