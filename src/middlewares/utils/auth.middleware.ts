import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../../utils/error.util";
import { OAuthCallbackUser } from "../../types/core/user.types";

export const isAuthenticated = (req: Request, _res: Response, next: NextFunction): void => {
    const token = req.cookies?.token;
    if (!token) return next(new UnauthorizedError("You must be logged in to access this resource"));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        req.user = decoded as any;
        return next();
    } catch {
        return next(new UnauthorizedError("Invalid or expired session"));
    }
};

export const isNewUser = (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user as OAuthCallbackUser;
    if (user?.isNewUser) return next();
    next(new UnauthorizedError("Access restricted to new users"));
};

export const isNotAuthenticated = (req: Request, _res: Response, next: NextFunction): void => {
    const token = req.cookies?.token;
    if (!token) return next();

    try {
        jwt.verify(token, process.env.JWT_SECRET!);
        return next(new UnauthorizedError("You are already logged in"));
    } catch {
        return next(); // token invalid/expired = treat as not authenticated
    }
};