import { Router } from "express";
import jwt from "jsonwebtoken";
import passport from "../../configs/integration/passport.config";
import {
    getMe,
    updateMe,
    deleteMe,
    getUserById,
    getLinkedProviders,
    unlinkProvider,
} from "../../controllers/core/user.controller";
import { requireAuth } from "../../middlewares/core/user.middleware";

const router = Router();

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

router.get("/github", passport.authenticate("github", { scope: ["user:email"], session: false }));

router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/auth", session: false }),
    (req, res) => {
        const user = req.user as any;
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.redirect(`${process.env.CLIENT_URL}/auth/callback`);
    }
);

router.get(
    "/github/callback",
    passport.authenticate("github", { failureRedirect: "/auth", session: false }),
    (req, res) => {
        const user = req.user as any;
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.redirect(`${process.env.CLIENT_URL}/auth/callback`);
    }
);

router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);
router.delete("/me", requireAuth, deleteMe);
router.get("/me/providers", requireAuth, getLinkedProviders);
router.delete("/me/providers/:provider", requireAuth, unlinkProvider);
router.get("/:id", getUserById);

export default router;