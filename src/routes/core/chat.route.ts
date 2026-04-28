import { ChatSessionModel, ChatMessageModel, PdfGenerationRecordModel } from "./../../models/core/chat.model";
import { Router, Request, Response, NextFunction } from "express";
import { ChatController } from "../../controllers/core/chat.controller";
import { MessageController } from "../../controllers/ai/message.controller";
import { ChatBulkController } from "../../controllers/core/chat.bullk.controller";
import { isAuthenticated } from "../../middlewares/utils/auth.middleware";
import { console_util } from "../../utils/console.util";
import Profile from "../../models/core/profile.model";

const router = Router();

const chatController = new ChatController(ChatSessionModel, ChatMessageModel, Profile);
const messageController = new MessageController(ChatMessageModel, ChatSessionModel);
const bulkController = new ChatBulkController(ChatSessionModel, ChatMessageModel, PdfGenerationRecordModel);

router.use((req: Request, _res: Response, next: NextFunction) => {
    console_util.verbose("ChatRoutes", `${req.method} ${req.path}`);
    next();
});

router.use(isAuthenticated);

router.post("/session", chatController.createSession);
router.get("/", chatController.listSessions);
router.get("/stats", chatController.getStats);
router.get("/search", bulkController.searchSessions);
router.get("/filter", bulkController.filterSessions);
router.get("/pdfs", bulkController.getUserPdfs);

router.delete("/bulk/soft", bulkController.deleteAllSessions);
router.delete("/bulk/permanent", bulkController.deleteAllSessionsPermanently);
router.patch("/bulk/archive", bulkController.archiveAllSessions);

router.get("/:sessionId", chatController.getSession);
router.patch("/:sessionId", chatController.updateSession);
router.delete("/:sessionId", chatController.deleteSession);

router.post("/:sessionId/message", chatController.sendMessage);
router.post("/:sessionId/export", chatController.exportPdf);

router.get("/:sessionId/messages", messageController.getMessagesBySession);
router.get("/messages/:messageId", messageController.getMessageById);
router.delete("/messages/:messageId", messageController.deleteMessage);

router.post("/:messageId/preview", chatController.renderPreview);

export default router;