import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import type { TemplateEntry } from "./registry";

interface EventInviteProps {
  kind?: "invitation" | "reminder";
  familyName?: string;
  eventTitle?: string;
  when?: string;
  location?: string;
  description?: string;
  calendarUrl?: string;
  invitedByName?: string;
}

const navy = "#132238";
const gold = "#b8934a";

const main = { backgroundColor: "#ffffff", fontFamily: 'Georgia, "Times New Roman", serif' };
const container = { maxWidth: "560px", margin: "0 auto", padding: "32px 28px" };
const kicker = {
  margin: "0 0 6px",
  fontSize: "12px",
  letterSpacing: "2px",
  textTransform: "uppercase" as const,
  color: gold,
  fontFamily: "Arial, sans-serif",
};
const heading = { margin: "0 0 12px", fontSize: "26px", lineHeight: "32px", color: navy };
const text = { margin: "0 0 12px", fontSize: "15px", lineHeight: "24px", color: "#33415c" };
const detail = {
  margin: "0",
  fontSize: "15px",
  lineHeight: "26px",
  color: navy,
  fontFamily: "Arial, sans-serif",
};
const card = {
  border: `1px solid #e6e1d7`,
  borderLeft: `4px solid ${gold}`,
  borderRadius: "10px",
  padding: "16px 18px",
  margin: "20px 0",
  backgroundColor: "#fbf9f5",
};
const button = {
  backgroundColor: navy,
  color: "#ffffff",
  borderRadius: "999px",
  padding: "13px 26px",
  fontSize: "15px",
  fontFamily: "Arial, sans-serif",
  textDecoration: "none",
  display: "inline-block",
};
const hr = { borderColor: "#e6e1d7", margin: "28px 0 16px" };
const footer = {
  margin: 0,
  fontSize: "12px",
  lineHeight: "20px",
  color: "#8a8578",
  fontFamily: "Arial, sans-serif",
};

const EventInviteEmail = ({
  kind = "invitation",
  familyName = "your family",
  eventTitle = "A family gathering",
  when,
  location,
  description,
  calendarUrl,
  invitedByName,
}: EventInviteProps) => {
  const isReminder = kind === "reminder";
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{isReminder ? `Coming up: ${eventTitle}` : `You're invited: ${eventTitle}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={kicker}>Eternal — Memories</Text>
          <Heading style={heading}>
            {isReminder ? `Coming up: ${eventTitle}` : `You're invited to ${eventTitle}`}
          </Heading>
          <Text style={text}>
            {isReminder
              ? `A gentle reminder from ${familyName}'s calendar.`
              : `${invitedByName ? `${invitedByName} added` : "Someone added"} this to ${familyName}'s calendar and would love you there.`}
          </Text>

          <Section style={card}>
            <Text style={detail}>
              <strong>{eventTitle}</strong>
            </Text>
            {when ? <Text style={detail}>{when}</Text> : null}
            {location ? <Text style={detail}>{location}</Text> : null}
            {description ? (
              <Text style={{ ...detail, color: "#33415c" }}>{description}</Text>
            ) : null}
          </Section>

          {calendarUrl ? (
            <Section style={{ margin: "20px 0" }}>
              <Button href={calendarUrl} style={button}>
                Open the family calendar
              </Button>
            </Section>
          ) : null}

          <Text style={text}>
            You can RSVP right in the calendar so everyone knows who is coming.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Sent from {familyName}'s private archive on Eternal — Memories.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: EventInviteEmail,
  subject: (data: Record<string, any>) =>
    data["kind"] === "reminder"
      ? `Reminder: ${data["eventTitle"] ?? "a family event"}`
      : `You're invited: ${data["eventTitle"] ?? "a family event"}`,
  displayName: "Event invitation & reminder",
  previewData: {
    kind: "invitation",
    familyName: "The Johnson Family",
    eventTitle: "Summer Reunion",
    when: "Saturday, 18 July 2026 · 14:00",
    location: "Grandma's garden, Hamburg",
    description: "Bring a dish and old photographs for the archive table.",
    calendarUrl: "https://example.com/calendar",
    invitedByName: "Maria",
  },
} satisfies TemplateEntry;
