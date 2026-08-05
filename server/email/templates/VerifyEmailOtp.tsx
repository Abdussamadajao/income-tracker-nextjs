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
import type { VerifyEmailOtpProps } from "../../types";
import { styles } from "./styles";

export default function VerifyEmailOtp({
  otp = "123456",
  otpExpiry = "10 minutes",
}: VerifyEmailOtpProps) {
  return (
    <Html>
      <Head />
      <Preview>Your verification code</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          {APP_LOGO ? (
            <Img src={APP_LOGO} alt="Company Logo" style={styles.logo} />
          ) : null}
          <Section style={{ padding: "20px 0" }}>
            <Heading style={styles.heading}>Verify Your Email</Heading>
            <Text style={styles.paragraph}>
              Please use the following code to verify your email address:
            </Text>
            <Text style={styles.otp}>{otp}</Text>
            <Text style={styles.paragraph}>
              This code will expire in {otpExpiry}.
            </Text>
            <Text style={styles.paragraph}>
              If you didn't request this code, you can safely ignore this email.
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
