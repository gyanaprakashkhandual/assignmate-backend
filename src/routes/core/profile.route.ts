import { Router } from "express";
import {
    getMyProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    uploadHandwritingImage,
    deleteHandwritingImage,
    getProfileByUsername,
} from "../../controllers/core/profile.controller";
import { requireAuth } from "../../middlewares/core/user.middleware";
import { uploadHandwritingImage as multerUpload, handleMulterError } from "../../middlewares/core/profile.middleware";

const router = Router();

router.get("/username/:username", getProfileByUsername);

router.use(requireAuth);

router.get("/me", getMyProfile);
router.post("/", createProfile);
router.patch("/me", updateProfile);
router.delete("/me", deleteProfile);
router.post("/me/handwriting", multerUpload, handleMulterError, uploadHandwritingImage);
router.delete("/me/handwriting", deleteHandwritingImage);

export default router;