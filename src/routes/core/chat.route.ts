import { ChatSessionModel, ChatMessageModel } from './../../models/core/chat.model';
import { Router, Request, Response, NextFunction } from "express";
import { ChatController } from "../../controllers/core/chat.controller";
import { isAuthenticated } from "../../middlewares/utils/auth.middleware";
import { console_util } from "../../utils/console.util";
import Profile from "../../models/core/profile.model";

const router = Router();
const chatController = new ChatController(ChatSessionModel, ChatMessageModel, Profile);

router.use((req: Request, _res: Response, next: NextFunction) => {
    console_util.verbose("ChatRoutes", `${req.method} ${req.path}`);
    next();
});

router.use(isAuthenticated);

router.post("/session", chatController.createSession);
router.get("/", chatController.listSessions);
router.get("/stats", chatController.getStats);
router.get("/:sessionId", chatController.getSession);
router.patch("/:sessionId", chatController.updateSession);
router.delete("/:sessionId", chatController.deleteSession);

router.post("/:sessionId/message", chatController.sendMessage);
router.post("/:messageId/preview", chatController.renderPreview);

router.post("/:sessionId/export", chatController.exportPdf);

export default router;