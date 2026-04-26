import { v2 as cloudinary } from "cloudinary";
import { logger } from "../../utils/logger.util";
import { console_util } from "../../utils/console.util";

/*** Cloudinary Service */
class CloudinaryService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        if (
            !process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET
        ) {
            console_util.warn("CloudinaryService", "Cloudinary not fully configured");
        }
    }

    /*** Upload PDF buffer */
    async uploadPdf(
        pdfBuffer: Buffer,
        fileName: string,
        userId: string
    ): Promise<{
        url: string;
        publicId: string;
        fileSize: number;
    }> {
        return new Promise((resolve, reject) => {
            try {
                console_util.verbose("CloudinaryService", "Uploading PDF", { fileName });

                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: "auto",
                        public_id: `assignmate/pdf/${userId}/${fileName}`,
                        folder: "assignmate/pdfs",
                        tags: ["assignmate", "pdf", userId],
                    },
                    (error, result) => {
                        if (error) {
                            logger.error("CloudinaryService", "PDF upload failed", {
                                error: error.message,
                                fileName,
                            });

                            console_util.error("CloudinaryService", "Upload failed", error.message);
                            reject(error);
                        } else if (result) {
                            logger.info("CloudinaryService", "PDF uploaded", {
                                publicId: result.public_id,
                                fileSize: result.bytes,
                                url: result.secure_url,
                            });

                            console_util.success("CloudinaryService", "PDF uploaded", {
                                fileName,
                                size: result.bytes,
                            });

                            resolve({
                                url: result.secure_url,
                                publicId: result.public_id,
                                fileSize: result.bytes,
                            });
                        }
                    }
                );

                uploadStream.end(pdfBuffer);
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";
                logger.error("CloudinaryService", "Upload stream error", {
                    error: errorMessage,
                });

                reject(error);
            }
        });
    }

    /*** Upload image */
    async uploadImage(
        imageBuffer: Buffer,
        fileName: string,
        userId: string
    ): Promise<{
        url: string;
        publicId: string;
    }> {
        return new Promise((resolve, reject) => {
            try {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: "auto",
                        public_id: `assignmate/images/${userId}/${fileName}`,
                        folder: "assignmate/images",
                        tags: ["assignmate", "image", userId],
                    },
                    (error, result) => {
                        if (error) {
                            logger.error("CloudinaryService", "Image upload failed", {
                                error: error.message,
                            });
                            reject(error);
                        } else if (result) {
                            logger.info("CloudinaryService", "Image uploaded", {
                                publicId: result.public_id,
                            });

                            resolve({
                                url: result.secure_url,
                                publicId: result.public_id,
                            });
                        }
                    }
                );

                uploadStream.end(imageBuffer);
            } catch (error) {
                logger.error("CloudinaryService", "Image upload error", { error });
                reject(error);
            }
        });
    }

    /*** Delete resource */
    async deleteResource(publicId: string): Promise<boolean> {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            logger.info("CloudinaryService", "Resource deleted", { publicId });
            return result.result === "ok";
        } catch (error) {
            logger.error("CloudinaryService", "Delete failed", {
                error: error instanceof Error ? error.message : "Unknown",
                publicId,
            });
            return false;
        }
    }

    /*** Get resource info */
    async getResourceInfo(publicId: string): Promise<{
        url: string;
        size: number;
        format: string;
    } | null> {
        try {
            const result = await cloudinary.api.resource(publicId);
            return {
                url: result.secure_url,
                size: result.bytes,
                format: result.format,
            };
        } catch (error) {
            logger.error("CloudinaryService", "Failed to get resource info", {
                error: error instanceof Error ? error.message : "Unknown",
            });
            return null;
        }
    }
}

export const cloudinaryService = new CloudinaryService();