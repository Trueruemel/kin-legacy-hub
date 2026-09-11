import React from "react";
import {
  Body,
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

interface PaymentReceiptProps {
  description?: string;
  amount?: string;
  paidOn?: string;
  reference?: string;
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
const hr = { borderColor: "#e6e1d7", margin: "28px 0 16px" };
const footer = {
  margin: 0,
  fontSize: "12px",
  lineHeight: "20px",
  color: "#8a8578",
  fontFamily: "Arial, sans-serif",
};

const PaymentReceiptEmail = ({
  description = "Your payment",
  amount = "",
  paidOn,
  reference,
}: PaymentReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your receipt from Eternal — Memories</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={kicker}>Eternal — Memories</Text>
        <Heading style={heading}>Thank you — here is your receipt</Heading>
        <Text style={text}>
          We have received your payment. Please keep this email as your receipt.
        </Text>

        <Section style={card}>
          <Text style={detail}>
            <strong>{description}</strong>
          </Text>
          {amount ? <Text style={detail}>Amount: {amount}</Text> : null}
          {paidOn ? <Text style={detail}>Paid on: {paidOn}</Text> : null}
          {reference ? <Text style={detail}>Reference: {reference}</Text> : null}
        </Section>

        <Text style={text}>
          If anything about this payment looks wrong, simply reply to this email and we will look
          into it.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>Sent from your private archive on Eternal — Memories.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: PaymentReceiptEmail,
  subject: "Your receipt — Eternal — Memories",
  displayName: "Payment receipt",
  previewData: {
    description: "Support us contribution",
    amount: "$25.00 USD",
    paidOn: "September 11, 2026",
    reference: "cs_test_123",
  } satisfies TemplateData,
} satisfies TemplateEntry;
