import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { ValidationError } from "../../utils/error.util";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new ValidationError("Handwriting image must be JPEG, PNG, or WebP"));
    }
    cb(null, true);
};

export const uploadHandwritingImage = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
        files: 1,
    },
}).single("handwritingImage");

export const handleMulterError = (
    err: unknown,
    _req: Request,
    _res: Response,
    next: NextFunction
): void => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return next(new ValidationError("Handwriting image must be under 5MB"));
        }
        if (err.code === "LIMIT_FILE_COUNT") {
            return next(new ValidationError("Only one handwriting image is allowed"));
        }
        return next(new ValidationError(err.message));
    }
    next(err);
};