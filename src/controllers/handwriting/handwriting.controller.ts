import { Request, Response, NextFunction } from "express";
import { Model, Types } from "mongoose";
import { cloudinaryService } from "../../services/cloudinary/cloudinary.service";
import { openRouterService } from "../../services/chat/openrouter.service";
import { catchAsync, ValidationError, NotFoundError } from "../../utils/error.util";
import { console_util } from "../../utils/console.util";
import { logger } from "../../utils/logger.util";

export class HandwritingController {
    constructor(private ProfileModel: any) {}

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

            const uploadResult = await cloudinaryService.uploadHandwritingImage(
                req.file.path,
                userId
            );

            let extractedStyles: Record<string, unknown> = {
                slant: 0.5,
                spacing: 1.0,
                strokeWeight: 0.6,
                lineIrregularity: 0.1,
                inkDensity: 0.85,
                extraData: {}, // ✅ always initialise extraData so the field exists
            };

            try {
                const characteristics = await openRouterService.extractHandwritingCharacteristics(
                    uploadResult.url
                );
                extractedStyles = {
                    ...characteristics,
                    extraData: characteristics.extraData ?? {}, // ✅ preserve extraData
                };
                console_util.success("HandwritingController", "Vision analysis complete", extractedStyles);
            } catch (err) {
                logger.error("HandwritingController", "Vision analysis failed, using defaults", { err });
            }

            const profile = await this.ProfileModel.findOneAndUpdate(
                { user: new Types.ObjectId(userId) },
                {
                    $set: {
                        "handwritingImage.url":             uploadResult.url,
                        "handwritingImage.publicId":        uploadResult.publicId,
                        "handwritingImage.extractedStyles": extractedStyles,
                        "handwritingImage.uploadedAt":      new Date(),
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
                    imageUrl: uploadResult.url,
                    publicId: uploadResult.publicId,
                    fontUrl:  profile.handwritingImage?.extractedStyles?.extraData?.fontUrl ?? null,
                    message:  "Handwriting sheet uploaded. Now upload your TTF font from Calligraphr.",
                },
            });
        }
    );

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

            const uploadResult = await cloudinaryService.uploadFontFile(
                req.file.path,
                userId
            );

            // ✅ FIXED: save into extractedStyles.extraData not handwritingImage.extraData
            const profile = await this.ProfileModel.findOneAndUpdate(
                { user: new Types.ObjectId(userId) },
                {
                    $set: {
                        "handwritingImage.extractedStyles.extraData.fontUrl":        uploadResult.url,
                        "handwritingImage.extractedStyles.extraData.fontPublicId":   uploadResult.publicId,
                        "handwritingImage.extractedStyles.extraData.fontUploadedAt": new Date(),
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

    getProfile = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;

            const profile = await this.ProfileModel.findOne({
                user: new Types.ObjectId(userId),
            });

            if (!profile) {
                throw new NotFoundError("Handwriting profile");
            }

            // ✅ FIXED: read fontUrl from extractedStyles.extraData
            res.status(200).json({
                success: true,
                data: {
                    imageUrl:        profile.handwritingImage?.url ?? null,
                    publicId:        profile.handwritingImage?.publicId ?? null,
                    fontUrl:         profile.handwritingImage?.extractedStyles?.extraData?.fontUrl ?? null,
                    extractedStyles: profile.handwritingImage?.extractedStyles ?? null,
                    hasFontReady:    !!profile.handwritingImage?.extractedStyles?.extraData?.fontUrl,
                },
            });
        }
    );

    deleteProfile = catchAsync(
        async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const userId = req.user?.id as string;

            const profile = await this.ProfileModel.findOne({
                user: new Types.ObjectId(userId),
            });

            if (!profile) {
                throw new NotFoundError("Handwriting profile");
            }

            if (profile.handwritingImage?.publicId) {
                await cloudinaryService.deleteFile(profile.handwritingImage.publicId, "image");
            }

            // ✅ FIXED: read fontPublicId from extractedStyles.extraData
            if (profile.handwritingImage?.extractedStyles?.extraData?.fontPublicId) {
                await cloudinaryService.deleteFont(
                    profile.handwritingImage.extractedStyles.extraData.fontPublicId
                );
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