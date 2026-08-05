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
import type { ForgotPasswordEmailOtpProps } from "../../types";
import { styles } from "./styles";

export default function ForgotPasswordEmailOtp({
  otp = "123456",
  otpExpiry = "10 minutes",
}: ForgotPasswordEmailOtpProps) {
  return (
    <Html>
      <Head />
      <Preview>Your password reset code</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          {APP_LOGO ? (
            <Img src={APP_LOGO} alt="Company Logo" style={styles.logo} />
          ) : null}
          <Section style={{ padding: "20px 0" }}>
            <Heading style={styles.heading}>Reset Your Password</Heading>
            <Text style={styles.paragraph}>Hi,</Text>
            <Text style={styles.paragraph}>
              Use this code to reset your password:
            </Text>
            <Text style={styles.otp}>{otp}</Text>
            <Text style={styles.paragraph}>
              This code will expire in {otpExpiry}.{"\n"}
              If you didn't request this code, please secure your account.
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
