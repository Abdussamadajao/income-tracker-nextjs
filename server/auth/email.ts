import type { User as BetterAuthUser } from "better-auth";
import type { UserWithTwoFactor } from "better-auth/plugins";
import Config from "../config";
import { emailTemplateDefaults, renderEmail } from "../email/templates";
import { nodemailerService } from "../email/nodemailer";
import { EmailTypes } from "../types/enums";
import { authLogger } from "../log";

const emailClient = nodemailerService();

type SendVerificationOtp = {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
};

type SendVerificationEmail = {
  user: BetterAuthUser;
  url: string;
};

type ResetPasswordEmail = {
  user: BetterAuthUser;
  url: string;
};

type MagicLinkEmail = {
  email: string;
  url: string;
};

type TwoFactorAuth = {
  user: UserWithTwoFactor;
  otp: string;
};

export const betterAuthEmail = {
  sendVerificationOtp: async ({ email, otp, type }: SendVerificationOtp) => {
    const { html, subject } =
      type === "sign-in"
        ? await renderEmail(EmailTypes.SignInOtp, {
            otp,
            otpExpiry: emailTemplateDefaults.signInOtpExpiry,
          })
        : type === "email-verification" || type === "change-email"
          ? await renderEmail(EmailTypes.VerifyEmailOtp, {
              otp,
              otpExpiry: emailTemplateDefaults.verifyEmailOtpExpiry,
            })
          : await renderEmail(EmailTypes.ForgotPasswordOtp, {
              otp,
              otpExpiry: emailTemplateDefaults.forgotPasswordOtpExpiry,
            });

    await emailClient.send({
      from: Config.smtp.from,
      to: email,
      subject,
      html,
    });
  },

  sendVerificationEmail: async ({ user, url }: SendVerificationEmail) => {
    authLogger.info({ userId: user.id }, "Sending verification email");
    const { html, subject } = await renderEmail(EmailTypes.VerifyEmail, {
      url,
    });

    await emailClient.send({
      from: Config.smtp.from,
      to: user.email,
      subject,
      html,
    });
  },
  resetPassword: async ({ user, url }: ResetPasswordEmail) => {
    authLogger.info({ userId: user.id }, "Sending reset password email");
    const { html, subject } = await renderEmail(EmailTypes.ForgotPassword, {
      url,
      expiry: emailTemplateDefaults.forgotPasswordLinkExpiryMinutes,
    });
    await emailClient.send({
      from: Config.smtp.from,
      to: user.email,
      subject,
      html,
    });
  },
  magicLink: async ({ email, url }: MagicLinkEmail) => {
    const { html, subject } = await renderEmail(EmailTypes.MagicLink, {
      link: url,
    });
    await emailClient.send({
      from: Config.smtp.from,
      to: email,
      subject,
      html,
    });
  },
  twoFactorAuth: async ({ user, otp }: TwoFactorAuth) => {
    const { html, subject } = await renderEmail(EmailTypes.TwoFactorAuthOtp, {
      otp,
      otpExpiry: emailTemplateDefaults.twoFactorOtpExpiry,
    });
    await emailClient.send({
      from: Config.smtp.from,
      to: user.email,
      subject,
      html,
    });
  },
};
