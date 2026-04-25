import { Schema } from "mongoose";
import { IProfileDocument, IHandwritingImage } from "../../types/core/profile.types";

const HandwritingImageSchema = new Schema<IHandwritingImage>(
    {
        url: {
            type: String,
            required: true,
        },
        publicId: {
            type: String,
            required: true,
        },
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

export const ProfileSchema = new Schema<IProfileDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 30,
            lowercase: true,
            match: [/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"],
        },
        nickname: {
            type: String,
            trim: true,
            maxlength: 50,
            default: null,
        },
        designation: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },
        age: {
            type: Number,
            min: [1, "Age must be at least 1"],
            max: [120, "Age must be under 120"],
            default: null,
        },
        handwritingImage: {
            type: HandwritingImageSchema,
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

ProfileSchema.index({ user: 1 }, { unique: true });
ProfileSchema.index({ username: 1 }, { unique: true });