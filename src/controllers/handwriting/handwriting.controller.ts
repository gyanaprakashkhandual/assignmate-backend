import { Request, Response, NextFunction } from "express";
import { Model, Types } from "mongoose";
import { cloudinaryService } from "../../services/cloudinary/cloudinary.service";
import { openRouterService } from "../../services/chat/openrouter.service";
import { catchAsync, ValidationError, NotFoundError } from "../../utils/error.util";
import { console_util } from "../../utils/console.util";
import { logger } from "../../utils/logger.util";

export class HandwritingController {
    constructor(private ProfileModel: any) {}

    /*** POST /api/handwriting/upload-sheet
     *  Accepts the filled Calligraphr template image,
     *  runs Claude Vision on it, uploads to Cloudinary,
     *  saves to profile. Frontend then downloads TTF from Calligraphr manually.
     */
    uploadSheet = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;

            if (!req.file) {
                throw new ValidationError("No file uploaded. Please attach your filled handwriting sheet.");
            }

            console_util.verbose("HandwritingController", "Processing handwriting sheet upload", {
                userId,
                mimetype: req.file.mimetype,
                size: req.file.size,
            });

            // ── Upload image to Cloudinary ────────────────────────────────────
            const uploadResult = await cloudinaryService.uploadHandwritingImage(
                req.file.path,
                userId
            );

            // ── Run Claude Vision to extract style characteristics ────────────
            let extractedStyles: Record<string, unknown> = {
                slant: 0.5,
                spacing: 1.0,
                strokeWeight: 0.6,
                lineIrregularity: 0.1,
                inkDensity: 0.85,
            };

            try {
                const characteristics = await openRouterService.extractHandwritingCharacteristics(
                    uploadResult.url
                );
                extractedStyles = { ...characteristics };
                console_util.success("HandwritingController", "Vision analysis complete", extractedStyles);
            } catch (err) {
                logger.error("HandwritingController", "Vision analysis failed, using defaults", { err });
            }

            // ── Save to profile ───────────────────────────────────────────────
            const profile = await this.ProfileModel.findOneAndUpdate(
                { user: new Types.ObjectId(userId) },
                {
                    $set: {
                        "handwritingImage.url":             uploadResult.url,
                        "handwritingImage.publicId":        uploadResult.publicId,
                        "handwritingImage.extractedStyles": extractedStyles,
                        "handwritingImage.uploadedAt":      new Date(),
                        // fontUrl is not set yet — user still needs to upload TTF
                    },
                },
                { new: true, upsert: true }
            );

            if (!profile) {
                throw new NotFoundError("Profile");
            }

            logger.info("HandwritingController", "Sheet uploaded and profile updated", {
                userId,
                publicId: uploadResult.publicId,
            });

            res.status(200).json({
                success: true,
                data: {
                    imageUrl:  uploadResult.url,
                    publicId:  uploadResult.publicId,
                    // fontUrl is null until TTF is uploaded
                    fontUrl:   profile.handwritingImage?.extraData?.fontUrl ?? null,
                    message:   "Handwriting sheet uploaded. Now upload your TTF font from Calligraphr.",
                },
            });
        }
    );

    /*** POST /api/handwriting/upload-font
     *  Accepts the TTF file downloaded from Calligraphr,
     *  uploads to Cloudinary, saves fontUrl into profile.extraData.
     *  After this, PDF generation will use the real handwriting font.
     */
    uploadFont = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;

            if (!req.file) {
                throw new ValidationError("No font file uploaded. Please attach your .ttf file.");
            }

            if (!req.file.originalname.endsWith(".ttf")) {
                throw new ValidationError("Invalid file type. Only .ttf files are accepted.");
            }

            console_util.verbose("HandwritingController", "Uploading TTF font", {
                userId,
                filename: req.file.originalname,
                size: req.file.size,
            });

            // ── Upload TTF to Cloudinary as raw resource ──────────────────────
            const uploadResult = await cloudinaryService.uploadFontFile(
                req.file.path,
                userId
            );

            // ── Save fontUrl into profile.handwritingImage.extraData ──────────
            const profile = await this.ProfileModel.findOneAndUpdate(
                { user: new Types.ObjectId(userId) },
                {
                    $set: {
                        "handwritingImage.extraData.fontUrl":      uploadResult.url,
                        "handwritingImage.extraData.fontPublicId": uploadResult.publicId,
                        "handwritingImage.extraData.fontUploadedAt": new Date(),
                    },
                },
                { new: true }
            );

            if (!profile) {
                throw new NotFoundError("Profile not found. Please upload your handwriting sheet first.");
            }

            logger.info("HandwritingController", "Font uploaded and saved to profile", {
                userId,
                fontUrl: uploadResult.url,
            });

            console_util.success("HandwritingController", "TTF font saved", {
                fontUrl: uploadResult.url,
            });

            res.status(200).json({
                success: true,
                data: {
                    fontUrl:  uploadResult.url,
                    publicId: uploadResult.publicId,
                    message:  "Font uploaded successfully. Your PDFs will now use your real handwriting.",
                },
            });
        }
    );

    /*** GET /api/handwriting/profile — Get the current user's handwriting profile */
    getProfile = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;

            const profile = await this.ProfileModel.findOne({
                user: new Types.ObjectId(userId),
            });

            if (!profile) {
                throw new NotFoundError("Handwriting profile");
            }

            res.status(200).json({
                success: true,
                data: {
                    imageUrl:        profile.handwritingImage?.url        ?? null,
                    publicId:        profile.handwritingImage?.publicId   ?? null,
                    fontUrl:         profile.handwritingImage?.extraData?.fontUrl ?? null,
                    extractedStyles: profile.handwritingImage?.extractedStyles    ?? null,
                    hasFontReady:    !!profile.handwritingImage?.extraData?.fontUrl,
                },
            });
        }
    );

    /*** DELETE /api/handwriting/profile — Delete the handwriting profile */
    deleteProfile = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;

            const profile = await this.ProfileModel.findOne({
                user: new Types.ObjectId(userId),
            });

            if (!profile) {
                throw new NotFoundError("Handwriting profile");
            }

            // Clean up Cloudinary assets
            if (profile.handwritingImage?.publicId) {
                await cloudinaryService.deleteFile(profile.handwritingImage.publicId, "image");
            }
            if (profile.handwritingImage?.extraData?.fontPublicId) {
                await cloudinaryService.deleteFont(profile.handwritingImage.extraData.fontPublicId);
            }

            await this.ProfileModel.findOneAndUpdate(
                { user: new Types.ObjectId(userId) },
                { $unset: { handwritingImage: "" } }
            );

            res.status(200).json({
                success: true,
                message: "Handwriting profile deleted.",
            });
        }
    );
}