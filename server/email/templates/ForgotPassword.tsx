import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { APP_LOGO, APP_NAME } from "../../constants";
import type { ForgotPasswordEmailProps } from "../../types";
import { styles } from "./styles";

export default function ForgotPasswordEmail({
  url,
  expiry,
}: ForgotPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          {APP_LOGO ? (
            <Img src={APP_LOGO} alt="Company Logo" style={styles.logo} />
          ) : null}
          <Section style={{ padding: "20px 0" }}>
            <Heading style={styles.heading}>Reset Your Password</Heading>
            <Text style={styles.paragraph}>
              We received a request to reset your password. Click the button
              below to set a new password:
            </Text>
            <Button href={url} style={styles.button}>
              Reset Password
            </Button>
            <Text style={styles.paragraph}>
              If the button above doesn't work, copy and paste this link into
              your browser:
            </Text>
            <Link
              href={url}
              style={{ color: "#2652bf", display: "block", marginTop: "8px" }}
            >
              {url}
            </Link>
            <Text style={styles.paragraph}>
              If you didn't request this change, you can safely ignore this
              email.
            </Text>
            <Text style={styles.paragraph}>
              For security, this link will expire in {expiry} minutes.
            </Text>
          </Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            This is an automated message from {APP_NAME}. If you need help,
            please contact support.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
