import { z } from "zod";

export const UpdateUserSchema = z.object({
    name: z
        .string()
        .min(1, "Name must not be empty")
        .max(100, "Name must be under 100 characters")
        .trim()
        .optional(),
    avatar: z.string().url("Avatar must be a valid URL").optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;