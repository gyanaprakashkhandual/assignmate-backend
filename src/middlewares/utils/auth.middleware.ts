import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../utils/error.util";
import { OAuthCallbackUser } from "../../types/core/user.types";

export const isAuthenticated = (req: Request, _res: Response, next: NextFunction): void => {
    if (req.isAuthenticated() && req.user) {
        return next();
    }
    next(new UnauthorizedError("You must be logged in to access this resource"));
};

export const isNewUser = (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user as OAuthCallbackUser;
    if (user?.isNewUser) {
        return next();
    }
    next(new UnauthorizedError("Access restricted to new users"));
};

export const isNotAuthenticated = (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated()) {
        return next();
    }
    next(new UnauthorizedError("You are already logged in"));
};