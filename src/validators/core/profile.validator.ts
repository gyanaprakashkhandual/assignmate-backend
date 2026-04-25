import { z } from "zod";

export const CreateProfileSchema = z.object({
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username must be under 30 characters")
        .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores")
        .toLowerCase(),
    nickname: z
        .string()
        .max(50, "Nickname must be under 50 characters")
        .trim()
        .optional(),
    designation: z
        .string()
        .max(100, "Designation must be under 100 characters")
        .trim()
        .optional(),
    age: z
        .number()
        .int("Age must be a whole number")
        .min(1, "Age must be at least 1")
        .max(120, "Age must be under 120")
        .optional(),
});

export const UpdateProfileSchema = CreateProfileSchema.partial();

export type CreateProfileInput = z.infer<typeof CreateProfileSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;