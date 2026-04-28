import { Document, Schema, Types } from "mongoose";

export type UserDesignation = string;

export interface IHandwritingExtractedStyles {
    slant: number;
    spacing: number;
    strokeWeight: number;
    lineIrregularity: number;
    inkDensity: number;
    fontFamily?: string;
    fontSize?: number;
    extraData?: Record<string, unknown>;
}

export interface IHandwritingImage {
    url: string;
    publicId: string;
    uploadedAt: Date;
    extractedStyles?: IHandwritingExtractedStyles;
    extraData?: Record<string, unknown>;
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

export interface IProfileDocument extends Document {
    user: Types.ObjectId;
    username: string;
    nickname?: string;
    designation?: string;
    age?: number;
    handwritingImage?: IHandwritingImage;
    createdAt: Date;
    updatedAt: Date;
}