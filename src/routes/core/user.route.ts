import { Router } from "express";
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

router.use(requireAuth);

router.get("/me", getMe);
router.patch("/me", updateMe);
router.delete("/me", deleteMe);
router.get("/me/providers", getLinkedProviders);
router.delete("/me/providers/:provider", unlinkProvider);
router.get("/:id", getUserById);

export default router;