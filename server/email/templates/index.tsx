import { render } from "@react-email/components";
import { APP_NAME } from "../../constants";
import type { EmailTypeParams } from "../../types";
import { EmailTypes } from "../../types/enums";
import ForgotPasswordEmail from "./ForgotPassword";
import ForgotPasswordEmailOtp from "./ForgotPasswordOtp";
import MagicLinkEmail from "./MagicLink";
import SignInOtpEmail from "./SignInOtpEmail";
import TwoFactorAuthOtp from "./TwoFactorAuthOtp";
import VerifyEmail from "./VerifyEmail";
import VerifyEmailOtp from "./VerifyEmailOtp";
import WelcomeEmail from "./WelcomeEmail";

export const emailTemplateDefaults = {
  signInOtpExpiry: "5 minutes",
  verifyEmailOtpExpiry: "10 minutes",
  forgotPasswordOtpExpiry: "10 minutes",
  twoFactorOtpExpiry: "5 minutes",
  forgotPasswordLinkExpiryMinutes: "60",
} as const;

export function getEmailSubject(emailType: EmailTypes): string {
  switch (emailType) {
    case EmailTypes.WelcomeEmail:
      return `Welcome to ${APP_NAME}!`;
    case EmailTypes.VerifyEmailOtp:
      return "Your verification code";
    case EmailTypes.ForgotPasswordOtp:
      return "Your password reset code";
    case EmailTypes.VerifyEmail:
      return "Verify your email address";
    case EmailTypes.SignInOtp:
      return "Your sign in code";
    case EmailTypes.MagicLink:
      return `Sign In To ${APP_NAME}`;
    case EmailTypes.ForgotPassword:
      return "Reset your password";
    case EmailTypes.TwoFactorAuthOtp:
      return "Your two-factor authentication code";
    default:
      throw new Error("Invalid email type");
  }
}

export async function renderEmail<T extends EmailTypes>(
  emailType: T,
  emailTypeParams: EmailTypeParams[T],
): Promise<{ html: string; subject: string }> {
  const html = await getEmailHtml(emailType, emailTypeParams);
  return { html, subject: getEmailSubject(emailType) };
}

export function getEmailHtml<T extends EmailTypes>(
  emailType: T,
  emailTypeParams: EmailTypeParams[T],
): Promise<string> {
  if (emailType === EmailTypes.WelcomeEmail) {
    return render(
      <WelcomeEmail
        {...(emailTypeParams as EmailTypeParams[EmailTypes.WelcomeEmail])}
      />,
    );
  }

  if (emailType === EmailTypes.VerifyEmailOtp) {
    return render(
      <VerifyEmailOtp
        {...(emailTypeParams as EmailTypeParams[EmailTypes.VerifyEmailOtp])}
      />,
    );
  }

  if (emailType === EmailTypes.ForgotPasswordOtp) {
    return render(
      <ForgotPasswordEmailOtp
        {...(emailTypeParams as EmailTypeParams[EmailTypes.ForgotPasswordOtp])}
      />,
    );
  }

  if (emailType === EmailTypes.VerifyEmail) {
    return render(
      <VerifyEmail
        {...(emailTypeParams as EmailTypeParams[EmailTypes.VerifyEmail])}
      />,
    );
  }

  if (emailType === EmailTypes.SignInOtp) {
    return render(
      <SignInOtpEmail
        {...(emailTypeParams as EmailTypeParams[EmailTypes.SignInOtp])}
      />,
    );
  }

  if (emailType === EmailTypes.MagicLink) {
    return render(
      <MagicLinkEmail
        {...(emailTypeParams as EmailTypeParams[EmailTypes.MagicLink])}
      />,
    );
  }

  if (emailType === EmailTypes.ForgotPassword) {
    return render(
      <ForgotPasswordEmail
        {...(emailTypeParams as EmailTypeParams[EmailTypes.ForgotPassword])}
      />,
    );
  }

  if (emailType === EmailTypes.TwoFactorAuthOtp) {
    return render(
      <TwoFactorAuthOtp
        {...(emailTypeParams as EmailTypeParams[EmailTypes.TwoFactorAuthOtp])}
      />,
    );
  }

  throw new Error("Invalid email type");
}
