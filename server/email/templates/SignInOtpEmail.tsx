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
import type { SignInOtpEmailProps } from "../../types";
import { styles } from "./styles";

export default function SignInOtpEmail({
  otp = "123456",
  otpExpiry = "5 minutes",
}: SignInOtpEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your sign in code</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          {APP_LOGO ? (
            <Img src={APP_LOGO} alt="Company Logo" style={styles.logo} />
          ) : null}
          <Section style={{ padding: "20px 0" }}>
            <Heading style={styles.heading}>Sign In Code</Heading>
            <Text style={styles.paragraph}>Hi,</Text>
            <Text style={styles.paragraph}>
              Use this code to sign in to your account:
            </Text>
            <Text style={styles.otp}>{otp}</Text>
            <Text style={styles.paragraph}>
              This code will expire in {otpExpiry}.
            </Text>
            <Text style={styles.paragraph}>
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
