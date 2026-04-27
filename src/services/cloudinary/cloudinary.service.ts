import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { logger } from "../../utils/logger.util";
import { console_util } from "../../utils/console.util";

/*** Configure Cloudinary from environment variables */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
    api_key:    process.env.CLOUDINARY_API_KEY    || "",
    api_secret: process.env.CLOUDINARY_API_SECRET || "",
    secure:     true,
});

export interface ICloudinaryUploadResult {
    url:       string;
    publicId:  string;
    fileSize:  number;
    format:    string;
    width?:    number;
    height?:   number;
}

export interface IUploadOptions {
    folder:     string;
    publicId?:  string;
    tags?:      string[];
    overwrite?: boolean;
}

/*** Cloudinary Service — handles all file uploads/deletes for Assignmate */
class CloudinaryService {

    // -------------------------------------------------------------------------
    // Handwriting image upload (JPG / PNG from the user's phone)
    // -------------------------------------------------------------------------

    async uploadHandwritingImage(
        filePath: string,
        userId: string
    ): Promise<ICloudinaryUploadResult> {
        try {
            console_util.verbose("CloudinaryService", "Uploading handwriting image", {
                userId,
                filePath,
            });

            const result: UploadApiResponse = await cloudinary.uploader.upload(
                filePath,
                {
                    folder:           `assignmate/handwriting/${userId}`,
                    resource_type:    "image",
                    overwrite:        true,
                    transformation:   [
                        // Normalise to a consistent size for Vision analysis
                        { width: 1200, height: 1600, crop: "limit" },
                        { quality: "auto:best" },
                    ],
                    tags: ["handwriting", `user_${userId}`],
                }
            );

            logger.info("CloudinaryService", "Handwriting image uploaded", {
                publicId: result.public_id,
                url:      result.secure_url,
            });

            return {
                url:      result.secure_url,
                publicId: result.public_id,
                fileSize: result.bytes,
                format:   result.format,
                width:    result.width,
                height:   result.height,
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            logger.error("CloudinaryService", "Handwriting image upload failed", { error: msg });
            console_util.error("CloudinaryService", "Image upload failed", { error: msg });
            throw error;
        }
    }

    // -------------------------------------------------------------------------
    // TTF font upload (from Calligraphr pipeline)
    // -------------------------------------------------------------------------

    async uploadFontFile(
        filePath: string,
        userId: string
    ): Promise<ICloudinaryUploadResult> {
        try {
            console_util.verbose("CloudinaryService", "Uploading TTF font", { userId });

            const result: UploadApiResponse = await cloudinary.uploader.upload(
                filePath,
                {
                    folder:        `assignmate/fonts/${userId}`,
                    resource_type: "raw",   // Cloudinary treats non-image files as "raw"
                    overwrite:     true,
                    tags:          ["font", "ttf", `user_${userId}`],
                }
            );

            logger.info("CloudinaryService", "Font uploaded", {
                publicId: result.public_id,
                url:      result.secure_url,
            });

            return {
                url:      result.secure_url,
                publicId: result.public_id,
                fileSize: result.bytes,
                format:   result.format,
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            logger.error("CloudinaryService", "Font upload failed", { error: msg });
            console_util.error("CloudinaryService", "Font upload failed", { error: msg });
            throw error;
        }
    }

    // -------------------------------------------------------------------------
    // PDF upload — takes a Buffer (from pdf-lib's pdfDoc.save())
    // -------------------------------------------------------------------------

    async uploadPdfBuffer(
        buffer: Buffer,
        options: IUploadOptions
    ): Promise<ICloudinaryUploadResult> {
        try {
            console_util.verbose("CloudinaryService", "Uploading PDF buffer", {
                folder:   options.folder,
                publicId: options.publicId,
            });

            // Cloudinary upload_stream is callback-based — wrap in a Promise
            const result = await new Promise<UploadApiResponse>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder:        options.folder,
                        public_id:     options.publicId,
                        resource_type: "raw",
                        overwrite:     options.overwrite ?? true,
                        tags:          options.tags ?? ["pdf", "assignment"],
                        format:        "pdf",
                    },
                    (error, result) => {
                        if (error || !result) {
                            reject(error ?? new Error("Cloudinary upload failed"));
                        } else {
                            resolve(result);
                        }
                    }
                );

                uploadStream.end(buffer);
            });

            logger.info("CloudinaryService", "PDF uploaded", {
                publicId: result.public_id,
                url:      result.secure_url,
                bytes:    result.bytes,
            });

            console_util.success("CloudinaryService", "PDF upload complete", {
                url: result.secure_url,
            });

            return {
                url:      result.secure_url,
                publicId: result.public_id,
                fileSize: result.bytes,
                format:   result.format,
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            logger.error("CloudinaryService", "PDF upload failed", { error: msg });
            console_util.error("CloudinaryService", "PDF upload failed", { error: msg });
            throw error;
        }
    }

    // -------------------------------------------------------------------------
    // Upload from a local file path (generic — used by Multer temp files)
    // -------------------------------------------------------------------------

    async uploadFile(
        filePath: string,
        options: IUploadOptions & { resourceType?: "image" | "raw" | "auto" }
    ): Promise<ICloudinaryUploadResult> {
        try {
            const result: UploadApiResponse = await cloudinary.uploader.upload(
                filePath,
                {
                    folder:        options.folder,
                    public_id:     options.publicId,
                    resource_type: options.resourceType ?? "auto",
                    overwrite:     options.overwrite ?? true,
                    tags:          options.tags ?? [],
                }
            );

            return {
                url:      result.secure_url,
                publicId: result.public_id,
                fileSize: result.bytes,
                format:   result.format,
                width:    result.width,
                height:   result.height,
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            logger.error("CloudinaryService", "File upload failed", { error: msg });
            throw error;
        }
    }

    // -------------------------------------------------------------------------
    // Delete a file by publicId
    // -------------------------------------------------------------------------

    async deleteFile(
        publicId:     string,
        resourceType: "image" | "raw" = "image"
    ): Promise<void> {
        try {
            await cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType,
            });

            logger.info("CloudinaryService", "File deleted", { publicId });
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            logger.error("CloudinaryService", "File delete failed", { error: msg });
            // Don't rethrow — a failed delete shouldn't break the main flow
        }
    }

    // -------------------------------------------------------------------------
    // Delete a PDF (raw resource type)
    // -------------------------------------------------------------------------

    async deletePdf(publicId: string): Promise<void> {
        return this.deleteFile(publicId, "raw");
    }

    // -------------------------------------------------------------------------
    // Delete a font file (raw resource type)
    // -------------------------------------------------------------------------

    async deleteFont(publicId: string): Promise<void> {
        return this.deleteFile(publicId, "raw");
    }

    // -------------------------------------------------------------------------
    // Generate a signed download URL (time-limited, for secure PDF access)
    // -------------------------------------------------------------------------

    getSignedUrl(
        publicId:    string,
        resourceType: "image" | "raw" = "raw",
        expiresInSeconds = 3600
    ): string {
        const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

        return cloudinary.url(publicId, {
            resource_type: resourceType,
            type:          "authenticated",
            sign_url:      true,
            expires_at:    expiresAt,
            secure:        true,
        });
    }

    // -------------------------------------------------------------------------
    // Health check
    // -------------------------------------------------------------------------

    async testConnection(): Promise<boolean> {
        try {
            await cloudinary.api.ping();
            return true;
        } catch {
            return false;
        }
    }
}

export const cloudinaryService = new CloudinaryService();