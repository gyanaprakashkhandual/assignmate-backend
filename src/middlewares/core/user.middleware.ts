import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../../utils/error.util";
import { OAuthCallbackUser } from "../../types/core/user.types";

declare global {
    namespace Express {
        interface User extends OAuthCallbackUser { }
    }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return next(new UnauthorizedError("Authentication required"));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        req.user = { _id: decoded.id } as unknown as OAuthCallbackUser;
        next();
    } catch {
        return next(new UnauthorizedError("Invalid or expired token"));
    }
};

export const isNotAuthenticated = (req: Request, _res: Response, next: NextFunction): void => {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
        return next();
    }
    next(new UnauthorizedError("You are already logged in"));
};