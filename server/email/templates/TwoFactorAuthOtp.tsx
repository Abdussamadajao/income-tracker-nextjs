import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { APP_LOGO, APP_NAME } from "../../constants";
import type { TwoFactorAuthOtpProps } from "../../types";
import { styles } from "./styles";

export default function TwoFactorAuthOtp({
  otp = "123456",
  otpExpiry = "5 minutes",
}: TwoFactorAuthOtpProps) {
  return (
    <Html>
      <Head />
      <Preview>Your two-factor authentication code</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          {APP_LOGO ? (
            <Img src={APP_LOGO} alt="Company Logo" style={styles.logo} />
          ) : null}
          <Section style={{ padding: "20px 0" }}>
            <Heading style={styles.heading}>Two-Factor Authentication</Heading>
            <Text style={styles.paragraph}>Hi,</Text>
            <Text style={styles.paragraph}>
              To complete your sign in, please use the following verification
              code:
            </Text>
            <Text style={styles.otp}>{otp}</Text>
            <Text style={styles.paragraph}>
              This code will expire in {otpExpiry}.
            </Text>
            <Text style={styles.paragraph}>
              If you didn't request this code, please secure your account
              immediately.
            </Text>
          </Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            This is an automated message from {APP_NAME}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
