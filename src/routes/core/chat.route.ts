import { Router, Request, Response, NextFunction } from "express";
import { Model } from "mongoose";
import { ChatController } from "../../controllers/core/chat.controller";
import { IChatSession, IChatMessage } from "../../types/core/chat.types";
import { isAuthenticated } from "../../middlewares/utils/auth.middleware";
import { console_util } from "../../utils/console.util";

export const createChatRoutes = (
  ChatSessionModel: Model<IChatSession>,
  ChatMessageModel: Model<IChatMessage>,
  ProfileModel: any
): Router => {
  const router = Router();
  const chatController = new ChatController(
    ChatSessionModel,
    ChatMessageModel,
    ProfileModel
  );

  /*** Logging middleware */
  router.use((req: Request, _res: Response, next: NextFunction) => {
    console_util.verbose("ChatRoutes", `${req.method} ${req.path}`);
    next();
  });

  /*** All routes require authentication */
  router.use(isAuthenticated);

  /*** Session Management */
  router.post("/session", chatController.createSession);
  router.get("/", chatController.listSessions);
  router.get("/stats", chatController.getStats);
  router.get("/:sessionId", chatController.getSession);
  router.patch("/:sessionId", chatController.updateSession);
  router.delete("/:sessionId", chatController.deleteSession);

  /*** Message & Generation */
  router.post("/:sessionId/message", chatController.sendMessage);
  router.post("/:messageId/preview", chatController.renderPreview);

  /*** PDF Export */
  router.post("/:sessionId/export", chatController.exportPdf);

  return router;
};