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
    id: string;
}

export interface IUserMethods {
    findByOAuth(provider: OAuthProvider, providerId: string): Promise<IUserDocument | null>;
}

export interface OAuthCallbackUser {
    _id: Types.ObjectId;
    id: string;
    name: string;
    email: string;
    avatar?: string;
    oauthProfiles: IOAuthProfile[];
    lastLoginAt: Date;
    isNewUser: boolean;
}