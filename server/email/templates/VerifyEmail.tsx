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
import { APP_LOGO, APP_NAME, COMPANY_ADDRESS } from "../../constants";
import type { VerifyEmailProps } from "../../types";
import { styles } from "./styles";

export default function EmailVerification({ url }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          {APP_LOGO ? (
            <Img src={APP_LOGO} alt="Company Logo" style={styles.logo} />
          ) : null}

          <Section style={{ padding: "20px 0" }}>
            <Heading
              style={{
                fontSize: "24px",
                fontWeight: "normal",
                textAlign: "center" as const,
              }}
            >
              Welcome!
            </Heading>
            <Text style={styles.paragraph}>
              Thanks for signing up! To get started, please verify your email
              address by clicking the button below.
            </Text>
            <Button href={url} style={styles.button}>
              Verify Email
            </Button>
            <Text style={styles.paragraph}>
              If you didn't create an account, you can safely ignore this email.
            </Text>
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
          </Section>

          <Hr style={styles.hr} />

          <Text style={styles.footer}>
            This email was sent from {APP_NAME}. If you have any questions,
            please contact our support team.
          </Text>
          <Text style={styles.footer}>{COMPANY_ADDRESS}</Text>
        </Container>
      </Body>
    </Html>
  );
}
