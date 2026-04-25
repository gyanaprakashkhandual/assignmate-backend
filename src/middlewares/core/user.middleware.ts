import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../utils/error.util";
import { OAuthCallbackUser } from "../../types/core/user.types";

declare global {
    namespace Express {
        interface User extends OAuthCallbackUser {}
    }
}
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
        return next(new UnauthorizedError("Authentication required"));
    }
    next();
};

export const attachUser = (req: Request, _res: Response, next: NextFunction): void => {
    next();
};