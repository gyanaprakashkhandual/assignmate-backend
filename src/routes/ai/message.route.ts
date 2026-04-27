import { Router, Request, Response, NextFunction } from "express";
import { MessageController } from "../../controllers/ai/message.controller";
import { ChatMessageModel, ChatSessionModel } from "../../models/core/chat.model";
import { isAuthenticated } from "../../middlewares/utils/auth.middleware";
import { console_util } from "../../utils/console.util";

const router = Router();
const messageController = new MessageController(ChatMessageModel, ChatSessionModel);

router.use((req: Request, _res: Response, next: NextFunction) => {
    console_util.verbose("MessageRoutes", `${req.method} ${req.path}`);
    next();
});

router.use(isAuthenticated);

router.get("/session/:sessionId", messageController.getMessagesBySession);
router.get("/:messageId", messageController.getMessageById);
router.delete("/:messageId", messageController.deleteMessage);

export default router;