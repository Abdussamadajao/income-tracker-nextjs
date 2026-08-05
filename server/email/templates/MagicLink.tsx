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
import { APP_LOGO, APP_NAME } from "../../constants";
import type { MagicLinkProps } from "../../types";
import { styles } from "./styles";

export default function MagicLinkEmail({ link }: MagicLinkProps) {
  return (
    <Html>
      <Head />
      <Preview>Sign In To {APP_NAME}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          {APP_LOGO ? (
            <Img src={APP_LOGO} alt="Company Logo" style={styles.logo} />
          ) : null}
          <Section style={{ padding: "20px 0" }}>
            <Heading style={styles.heading}>Hi, Welcome back!</Heading>
            <Button href={link} style={styles.button}>
              Sign In
            </Button>
            <Text style={styles.paragraph}>
              If you didn't request this link, you can safely ignore this email.
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
