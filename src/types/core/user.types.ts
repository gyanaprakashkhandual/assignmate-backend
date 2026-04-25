import { Document, Types } from "mongoose";

export type OAuthProvider = "google" | "github";

export interface IOAuthProfile {
    provider: OAuthProvider;
    providerId: string;
    accessToken: string;
    refreshToken?: string;
}

export interface IUser {
    name: string;
    email: string;
    avatar?: string;
    oauthProfiles: IOAuthProfile[];
    lastLoginAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
    _id: Types.ObjectId;
}

export interface IUserMethods {
    findByOAuth(provider: OAuthProvider, providerId: string): Promise<IUserDocument | null>;
}

export interface OAuthCallbackUser extends Omit<IUser, "createdAt" | "updatedAt"> {
    _id: Types.ObjectId;
    isNewUser: boolean;
}

export interface AuthenticatedRequest extends Express.Request {
    user?: OAuthCallbackUser;
}