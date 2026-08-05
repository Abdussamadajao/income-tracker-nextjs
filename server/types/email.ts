import { EmailClient, EmailTypes } from "./enums";

export interface EmailAdapter {
  emailService: EmailClientService;
}

export interface EmailServiceStore {
  getEmailAdapter: (client?: EmailClient) => EmailAdapter;
}

export type EmailUser = { name?: string; email: string };

export interface SendEmailParams {
  from: string | EmailUser;
  subject?: string;
  to: string | string[] | EmailUser | EmailUser[];
  reply_to?: string | EmailUser;
  send_at?: number;
  delivery_time?: string;
  tags?: string[];
  html?: string;
}

export interface EmailServiceSendPayload<T extends EmailTypes> {
  emailType: T;
  emailTypeParams: EmailTypeParams[T];
  params: SendEmailParams;
  client?: EmailClient;
}

export interface EmailService {
  send<T extends EmailTypes>(params: EmailServiceSendPayload<T>): Promise<void>;
}

export interface EmailClientService {
  send(params: SendEmailParams): Promise<void>;
}

export interface ForgotPasswordEmailOtpProps {
  otp: string;
  otpExpiry: string;
}

export interface MagicLinkProps {
  link: string;
}

export interface ForgotPasswordEmailProps {
  url: string;
  expiry: string;
}

export interface VerifyEmailOtpProps {
  otp: string;
  otpExpiry: string;
}

export interface VerifyEmailProps {
  url: string;
}

export interface WelcomeEmailProps {
  url: string;
}

export interface SignInOtpEmailProps {
  otp: string;
  otpExpiry: string;
}

export interface TwoFactorAuthOtpProps {
  otp: string;
  otpExpiry: string;
}

export interface EmailTypeParams {
  [EmailTypes.WelcomeEmail]: WelcomeEmailProps;
  [EmailTypes.VerifyEmailOtp]: VerifyEmailOtpProps;
  [EmailTypes.ForgotPasswordOtp]: ForgotPasswordEmailOtpProps;
  [EmailTypes.SignInOtp]: SignInOtpEmailProps;
  [EmailTypes.VerifyEmail]: VerifyEmailProps;
  [EmailTypes.ForgotPassword]: ForgotPasswordEmailProps;
  [EmailTypes.MagicLink]: MagicLinkProps;
  [EmailTypes.TwoFactorAuthOtp]: TwoFactorAuthOtpProps;
}
