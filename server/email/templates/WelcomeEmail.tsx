import {
  Body,
  Button,
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
import { APP_LOGO, APP_NAME, COMPANY_ADDRESS } from "../../constants";
import type { WelcomeEmailProps } from "../../types";
import { styles } from "./styles";

export default function WelcomeEmail({ url }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {APP_NAME}!</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          {APP_LOGO ? (
            <Img src={APP_LOGO} alt="Company Logo" style={styles.logo} />
          ) : null}
          <Section style={{ padding: "20px 0" }}>
            <Heading style={styles.heading}>Welcome to {APP_NAME}!</Heading>
            <Text style={styles.paragraph}>
              We're excited to have you on board! Your account has been
              successfully created.
            </Text>
            <Text style={styles.paragraph}>
              With your new account, you can:
            </Text>
            <Text style={styles.paragraph}>• Access all our features</Text>
            <Text style={styles.paragraph}>• Analytics</Text>
            <Text style={styles.paragraph}>• Grow your business</Text>
            <Button href={url} style={styles.button}>
              Get Started
            </Button>
            <Text style={styles.paragraph}>
              If you have any questions, our support team is always here to
              help.
            </Text>
          </Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>{COMPANY_ADDRESS}</Text>
        </Container>
      </Body>
    </Html>
  );
}
