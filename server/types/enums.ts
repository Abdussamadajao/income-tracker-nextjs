export enum NODE_ENV {
  DEVELOPMENT = "development",
  PRODUCTION = "production",
  TEST = "test",
}

export enum EmailClient {
  Nodemailer = "nodemailer",
}

export enum EmailTypes {
  WelcomeEmail = "welcome-email",
  VerifyEmailOtp = "verify-email-otp",
  ForgotPasswordOtp = "forgot-password-otp",
  SignInOtp = "sign-in-otp",
  VerifyEmail = "verify-email",
  MagicLink = "magic-link",
  ForgotPassword = "forgot-password",
  TwoFactorAuthOtp = "two-factor-auth-otp",
}

export enum HttpStatusCode {
  Ok = 200,
  Created = 201,
  NoContent = 204,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  InternalServerError = 500,
  BadGateway = 502,
  ServiceUnavailable = 503,
  GatewayTimeout = 504,
}
