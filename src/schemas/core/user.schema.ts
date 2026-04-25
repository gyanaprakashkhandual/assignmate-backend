import { Schema } from "mongoose";
import { IOAuthProfile, IUserDocument, IUserMethods } from "../../types/core/user.types";

const OAuthProfileSchema = new Schema<IOAuthProfile>(
    {
        provider: {
            type: String,
            enum: ["google", "github"],
            required: true,
        },
        providerId: {
            type: String,
            required: true,
        },
        accessToken: {
            type: String,
            required: true,
        },
        refreshToken: {
            type: String,
        },
    },
    { _id: false }
);

export const UserSchema = new Schema<IUserDocument>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        avatar: {
            type: String,
            default: null,
        },
        oauthProfiles: {
            type: [OAuthProfileSchema],
            default: [],
        },
        lastLoginAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ "oauthProfiles.provider": 1, "oauthProfiles.providerId": 1 });

UserSchema.statics.findByOAuth = async function (
    provider: string,
    providerId: string
): Promise<IUserDocument | null> {
    return this.findOne({
        oauthProfiles: {
            $elemMatch: { provider, providerId },
        },
    });
};