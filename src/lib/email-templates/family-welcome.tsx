import * as React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import type { TemplateEntry } from "./registry";

export interface FamilyWelcomeEmailProps {
  familyName: string;
  memberName?: string;
  siteUrl: string;
  familyUrl?: string;
  treeUrl: string;
  calendarUrl: string;
}

export const FamilyWelcomeEmail = ({
  familyName,
  memberName,
  siteUrl,
  familyUrl,
  treeUrl,
  calendarUrl,
}: FamilyWelcomeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to the {familyName} archive on Eternal — Memories</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Eternal — Memories</Text>
        <Heading style={h1}>Welcome to {familyName}</Heading>
        <Text style={text}>
          {memberName ? `${memberName}, you're` : "You're"} now part of the{" "}
          <strong>{familyName}</strong> archive — a private place for your family's stories, photos,
          recipes and milestones.
        </Text>
        <Text style={text}>Here is where to start:</Text>
        <Section style={{ margin: "0 0 24px" }}>
          <Button className="dm-btn" style={button} href={familyUrl ?? treeUrl}>
            Open your family page
          </Button>
          <Text style={{ ...text, margin: "14px 0 0" }}>
            From there you can open the{" "}
            <Link href={treeUrl} style={link}>
              family tree
            </Link>{" "}
            and the{" "}
            <Link href={calendarUrl} style={link}>
              family calendar
            </Link>{" "}
            with photos, birthdays and gatherings.
          </Text>
        </Section>

        <Text style={footer}>
          You received this email because you joined a family archive at{" "}
          <Link href={siteUrl} style={link}>
            Eternal — Memories
          </Link>
          .
        </Text>
      </Container>
    </Body>
  </Html>
);

export default FamilyWelcomeEmail;

export const template: TemplateEntry = {
  component: FamilyWelcomeEmail,
  displayName: "Family welcome",
  subject: (data) => `Welcome to ${data["familyName"] ?? "your family archive"}`,
  previewData: {
    familyName: "The Berger Family",
    memberName: "Tristan",
    siteUrl: "https://eternalmemorys.enterprises",
    familyUrl: "https://eternalmemorys.enterprises/family/00000000-0000-0000-0000-000000000000",
    treeUrl: "https://eternalmemorys.enterprises/tree",
    calendarUrl: "https://eternalmemorys.enterprises/calendar",
  },
};

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "Georgia, Times New Roman, serif",
};
const container = { padding: "24px 25px", maxWidth: "560px" };
const brand = {
  fontSize: "12px",
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  color: "#a98a4b",
  margin: "0 0 18px",
};
const h1 = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#14263f",
  margin: "0 0 18px",
};
const text = {
  fontSize: "15px",
  color: "#55575d",
  lineHeight: "1.6",
  margin: "0 0 18px",
};
const link = { color: "#14263f", textDecoration: "underline" };
const button = {
  backgroundColor: "#14263f",
  color: "#ffffff",
  fontSize: "14px",
  border: "1px solid #14263f",
  borderRadius: "8px",
  padding: "12px 20px",
  textDecoration: "none",
};
const footer = { fontSize: "12px", color: "#999999", margin: "30px 0 0" };
