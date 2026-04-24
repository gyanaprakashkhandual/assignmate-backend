import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing required environment variable: RESEND_API_KEY");
}

if (!process.env.RESEND_FROM_EMAIL) {
    throw new Error("Missing required environment variable: RESEND_FROM_EMAIL");
}

if (!process.env.RESEND_FROM_NAME) {
    throw new Error("Missing required environment variable: RESEND_FROM_NAME");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const DEFAULT_FROM = `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`;

export const MAIL_CONFIG = {
    from: DEFAULT_FROM,
    replyTo: process.env.RESEND_REPLY_TO_EMAIL ?? process.env.RESEND_FROM_EMAIL,
} as const;