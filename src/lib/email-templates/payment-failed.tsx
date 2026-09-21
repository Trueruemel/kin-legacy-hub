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

import type { TemplateData, TemplateEntry } from "./registry";

interface PaymentFailedProps {
  amount?: string;
  attemptedOn?: string;
  retriesUntil?: string;
  billingUrl?: string;
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
  border: "1px solid #e6e1d7",
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
const hr = { borderColor: "#e6e1d7", margin: "26px 0 14px" };
const small = { margin: 0, fontSize: "12px", color: "#7a8699", fontFamily: "Arial, sans-serif" };

const Email = ({ amount, attemptedOn, retriesUntil, billingUrl }: PaymentFailedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We could not take the payment for your extra storage</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={kicker}>Eternal — Memories</Text>
        <Heading style={heading}>A payment did not go through</Heading>
        <Text style={text}>
          Your card was declined for this month's extra storage. Nothing has been removed — your
          photos, recordings and documents are untouched.
        </Text>

        <Section style={card}>
          <Text style={detail}>
            {amount ? `Amount: ${amount}` : "Amount: extra storage"}
            {attemptedOn ? ` · Attempted on ${attemptedOn}` : ""}
          </Text>
          {retriesUntil ? <Text style={detail}>We will try again until {retriesUntil}.</Text> : null}
        </Section>

        <Text style={text}>
          Updating your card takes a moment and keeps your extra room in place.
        </Text>

        {billingUrl ? (
          <Section style={{ margin: "22px 0" }}>
            <Button href={billingUrl} style={button}>
              Update your card
            </Button>
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={small}>
          If the extra storage is no longer needed, you can simply let it lapse — your files stay,
          and only the extra room goes away.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Your storage payment did not go through",
  displayName: "Payment failed",
  previewData: {
    amount: "3.99 USD",
    attemptedOn: "September 13, 2026",
    retriesUntil: "September 27, 2026",
    billingUrl: "https://eternalmemorys.enterprises/upgrade",
  } satisfies TemplateData,
} satisfies TemplateEntry;
