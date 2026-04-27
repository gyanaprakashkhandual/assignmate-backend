import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import Profile from "../../models/core/profile.model";
import {
    catchAsync,
    NotFoundError,
    ConflictError,
    ValidationError,
} from "../../utils/error.util";
import { CreateProfileSchema, UpdateProfileSchema } from "../../validators/core/profile.validator";
import { logger } from "../../utils/logger.util";
import { console_util } from "../../utils/console.util";
import { OAuthCallbackUser } from "../../types/core/user.types";

const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<{ url: string; publicId: string }> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: "image", transformation: [{ quality: "auto" }] },
            (error, result) => {
                if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
                resolve({ url: result.secure_url, publicId: result.public_id });
            }
        );
        stream.end(buffer);
    });
};

export const getMyProfile = catchAsync(async (req: Request, res: Response) => {
    const currentUser = req.user as OAuthCallbackUser;

    const profile = await Profile.findOne({ user: currentUser._id }).populate("user", "name email avatar");

    if (!profile) {
        throw new NotFoundError("Profile");
    }

    logger.info("ProfileController", "User fetched own profile", { userId: currentUser._id });

    res.status(200).json({
        success: true,
        data: profile,
    });
});

export const createProfile = catchAsync(async (req: Request, res: Response) => {
    const currentUser = req.user as OAuthCallbackUser;

    const existing = await Profile.findOne({ user: currentUser._id });
    if (existing) {
        throw new ConflictError("Profile already exists for this user");
    }

    const parsed = CreateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0].message);
    }

    const usernameExists = await Profile.findOne({ username: parsed.data.username });
    if (usernameExists) {
        throw new ConflictError("Username is already taken");
    }

    const profile = await Profile.create({
        user: currentUser._id,
        ...parsed.data,
    });

    logger.info("ProfileController", "User created profile", { userId: currentUser._id, profileId: profile._id });
    console_util.success("ProfileController", "Profile created", { userId: currentUser._id });

    res.status(201).json({
        success: true,
        data: profile,
    });
});

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
    const currentUser = req.user as OAuthCallbackUser;

    const parsed = UpdateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0].message);
    }

    if (parsed.data.username) {
        const usernameExists = await Profile.findOne({
            username: parsed.data.username,
            user: { $ne: currentUser._id },
        });
        if (usernameExists) {
            throw new ConflictError("Username is already taken");
        }
    }

    const profile = await Profile.findOneAndUpdate(
        { user: currentUser._id },
        { $set: parsed.data },
        { new: true, runValidators: true }
    ).populate("user", "name email avatar");

    if (!profile) {
        throw new NotFoundError("Profile");
    }

    logger.info("ProfileController", "User updated profile", { userId: currentUser._id });
    console_util.success("ProfileController", "Profile updated", { userId: currentUser._id });

    res.status(200).json({
        success: true,
        data: profile,
    });
});

export const deleteProfile = catchAsync(async (req: Request, res: Response) => {
    const currentUser = req.user as OAuthCallbackUser;

    const profile = await Profile.findOne({ user: currentUser._id });
    if (!profile) {
        throw new NotFoundError("Profile");
    }

    if (profile.handwritingImage?.publicId) {
        await cloudinary.uploader.destroy(profile.handwritingImage.publicId);
    }

    await profile.deleteOne();

    logger.info("ProfileController", "User deleted profile", { userId: currentUser._id });
    console_util.warn("ProfileController", "Profile deleted", { userId: currentUser._id });

    res.status(200).json({
        success: true,
        message: "Profile deleted successfully",
    });
});

export const uploadHandwritingImage = catchAsync(async (req: Request, res: Response) => {
    const currentUser = req.user as OAuthCallbackUser;

    if (!req.file) {
        throw new ValidationError("Handwriting image file is required");
    }

    const profile = await Profile.findOne({ user: currentUser._id });
    if (!profile) {
        throw new NotFoundError("Profile");
    }

    if (profile.handwritingImage?.publicId) {
        await cloudinary.uploader.destroy(profile.handwritingImage.publicId);
        logger.info("ProfileController", "Deleted previous handwriting image from Cloudinary", {
            publicId: profile.handwritingImage.publicId,
        });
    }

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, "inkify/handwriting");

    profile.handwritingImage = { url, publicId, uploadedAt: new Date(), extraData: {} };
    await profile.save();

    logger.info("ProfileController", "Handwriting image uploaded", { userId: currentUser._id, publicId });
    console_util.success("ProfileController", "Handwriting image uploaded", { userId: currentUser._id });

    res.status(200).json({
        success: true,
        data: {
            url,
            publicId,
            uploadedAt: profile.handwritingImage.uploadedAt,
        },
    });
});

export const deleteHandwritingImage = catchAsync(async (req: Request, res: Response) => {
    const currentUser = req.user as OAuthCallbackUser;

    const profile = await Profile.findOne({ user: currentUser._id });
    if (!profile) {
        throw new NotFoundError("Profile");
    }

    if (!profile.handwritingImage?.publicId) {
        throw new NotFoundError("Handwriting image");
    }

    await cloudinary.uploader.destroy(profile.handwritingImage.publicId);

    profile.handwritingImage = undefined;
    await profile.save();

    logger.info("ProfileController", "Handwriting image deleted", { userId: currentUser._id });
    console_util.warn("ProfileController", "Handwriting image deleted", { userId: currentUser._id });

    res.status(200).json({
        success: true,
        message: "Handwriting image deleted successfully",
    });
});

export const getProfileByUsername = catchAsync(async (req: Request, res: Response) => {
    const { username } = req.params;

    const profile = await Profile.findOne({ username }).populate("user", "name avatar");

    if (!profile) {
        throw new NotFoundError("Profile");
    }

    res.status(200).json({
        success: true,
        data: profile,
    });
});