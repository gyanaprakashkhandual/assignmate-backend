import { Request, Response } from "express";
import User from "../../models/core/user.model";
import { catchAsync } from "../../utils/error.util";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/error.util";
import { UpdateUserSchema } from "../../validators/core/user.validator";
import { logger } from "../../utils/logger.util";
import { console_util } from "../../utils/console.util";
import { OAuthCallbackUser } from "../../types/core/user.types";
import { Types } from "mongoose";

export const getMe = catchAsync(async (req: Request, res: Response) => {
    const currentUser = req.user as OAuthCallbackUser;

    const user = await User.findById(currentUser._id).select("-oauthProfiles");

    if (!user) {
        throw new NotFoundError("User");
    }

    logger.info("UserController", "User fetched profile", { userId: user._id });
    console_util.success("UserController", "User fetched profile", { userId: user._id });

    res.status(200).json({
        success: true,
        data: user,
    });
});

export const updateMe = catchAsync(async (req: Request, res: Response) => {
    const currentUser = req.user as OAuthCallbackUser;

    const parsed = UpdateUserSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0].message);
    }

    const user = await User.findByIdAndUpdate(
        currentUser._id,
        { $set: parsed.data },
        { new: true, runValidators: true }
    ).select("-oauthProfiles");

    if (!user) {
        throw new NotFoundError("User");
    }

    logger.info("UserController", "User updated profile", { userId: user._id });
    console_util.success("UserController", "User updated profile", { userId: user._id });

    res.status(200).json({
        success: true,
        data: user,
    });
});

export const deleteMe = catchAsync(async (req: Request, res: Response) => {
    const currentUser = req.user as OAuthCallbackUser;

    const user = await User.findByIdAndDelete(currentUser._id);

    if (!user) {
        throw new NotFoundError("User");
    }

    logger.info("UserController", "User deleted account", { userId: currentUser._id });
    console_util.warn("UserController", "User deleted account", { userId: currentUser._id });

    req.logout?.(() => { });

    res.status(200).json({
        success: true,
        message: "Account deleted successfully",
    });
});

export const getUserById = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    if (!Types.ObjectId.isValid(id)) {
        throw new ValidationError("Invalid user ID format");
    }

    const user = await User.findById(id).select("-oauthProfiles");

    if (!user) {
        throw new NotFoundError("User");
    }

    res.status(200).json({
        success: true,
        data: user,
    });
});

export const getLinkedProviders = catchAsync(async (req: Request, res: Response) => {
    const currentUser = req.user as OAuthCallbackUser;

    const user = await User.findById(currentUser._id).select("oauthProfiles");

    if (!user) {
        throw new NotFoundError("User");
    }

    const providers = user.oauthProfiles.map((p) => ({
        provider: p.provider,
        providerId: p.providerId,
    }));

    res.status(200).json({
        success: true,
        data: providers,
    });
});

export const unlinkProvider = catchAsync(async (req: Request, res: Response) => {
    const currentUser = req.user as OAuthCallbackUser;
    const provider = req.params.provider as string;

    if (!["google", "github"].includes(provider)) {
        throw new ValidationError("Invalid provider. Must be google or github");
    }

    const user = await User.findById(currentUser._id);

    if (!user) {
        throw new NotFoundError("User");
    }

    if (user.oauthProfiles.length <= 1) {
        throw new ForbiddenError("Cannot unlink the only authentication provider");
    }

    user.oauthProfiles = user.oauthProfiles.filter((p) => p.provider !== provider);

    await user.save();

    logger.info("UserController", "User unlinked provider", { userId: user._id, provider });
    console_util.info("UserController", "User unlinked provider", { userId: user._id, provider });

    res.status(200).json({
        success: true,
        message: `${provider} account unlinked successfully`,
    });
});