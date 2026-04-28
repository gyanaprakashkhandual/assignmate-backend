import { resend, MAIL_CONFIG } from "../../configs/service/mail.config";
import { welcomeTemplate } from "../../templates/mails/Welcome.template";
import { logger } from "../../utils/logger.util";
import { OAuthCallbackUser } from "../../types/core/user.types";

export const sendWelcomeMail = async (user: OAuthCallbackUser): Promise<void> => {
    const { error } = await resend.emails.send({
        from: MAIL_CONFIG.from,
        replyTo: MAIL_CONFIG.replyTo,
        to: user.email,
        subject: "Welcome to Assignmate 👋",
        html: welcomeTemplate(user.name, user.email),
    });

    if (error) {
        logger.error("MailService", "Failed to send welcome email", { userId: user._id, error });
        return;
    }

    logger.info("MailService", "Welcome email sent", { userId: user._id, to: user.email });
};