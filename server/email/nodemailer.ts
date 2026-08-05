import nodemailer, {
  type SendMailOptions,
  type TransportOptions,
} from "nodemailer";
import Config from "../config";
import { logger } from "../log";
import { type EmailClientService, type SendEmailParams } from "../types/email";

const transporter = nodemailer.createTransport({
  host: Config.smtp.host,
  port: Config.smtp.port,
  secure: Config.smtp.secure,
  auth: {
    user: Config.smtp.auth.user,
    pass: Config.smtp.auth.pass,
  },
  tls: {
    rejectUnauthorized: false,
  },
} as TransportOptions);

export function nodemailerService(): EmailClientService {
  async function send(params: SendEmailParams): Promise<void> {
    try {
      if (
        !Config.smtp.host ||
        !Config.smtp.auth.user ||
        !Config.smtp.auth.pass
      ) {
        logger.error(
          {
            smtp: {
              host: Config.smtp.host,
              hasUser: !!Config.smtp.auth.user,
              hasPass: !!Config.smtp.auth.pass,
            },
          },
          "[NodemailerService][Send] - SMTP configuration missing",
        );
        throw new Error(
          "SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD environment variables.",
        );
      }

      const to = (Array.isArray(params.to) ? params.to : [params.to]) as
        | string
        | string[];

      const options: SendMailOptions = {
        from: params.from as string,
        to,
        subject: params.subject,
        html: params.html,
        replyTo: params?.reply_to as string,
        date: params?.send_at?.toString(),
      };

      await transporter.sendMail(options);
      logger.info(
        { to, subject: params.subject },
        "[NodemailerService][Send] - Email sent successfully",
      );
    } catch (error) {
      logger.error(
        { error, params: { to: params.to, subject: params.subject } },
        "[NodemailerService][Send] - error",
      );
      throw error;
    }
  }

  return { send };
}

export { transporter };
