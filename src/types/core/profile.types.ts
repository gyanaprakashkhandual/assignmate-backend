import { Document, Types } from "mongoose";

export type UserDesignation = string;

export interface IHandwritingImage {
    url: string;
    publicId: string;
    uploadedAt: Date;
}

export interface IProfile {
    user: Types.ObjectId;
    username: string;
    nickname?: string;
    designation?: UserDesignation;
    age?: number;
    handwritingImage?: IHandwritingImage;
    createdAt: Date;
    updatedAt: Date;
}

export interface IProfileDocument extends IProfile, Document {
    _id: Types.ObjectId;
}