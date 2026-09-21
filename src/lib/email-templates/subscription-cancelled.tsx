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

interface SubscriptionCancelledProps {
  endsOn?: string;
  amount?: string;
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

const Email = ({ endsOn, amount, billingUrl }: SubscriptionCancelledProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your extra storage has been cancelled</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={kicker}>Eternal — Memories</Text>
        <Heading style={heading}>Your extra storage will end</Heading>
        <Text style={text}>
          We have cancelled the monthly extra storage for your family archive. Nothing is deleted:
          every photo, recording and document stays exactly where it is.
        </Text>

        <Section style={card}>
          <Text style={detail}>
            {endsOn ? `Extra room stays until ${endsOn}` : "Extra room stays until the paid month ends"}
          </Text>
          {amount ? <Text style={detail}>No further payment of {amount} will be taken.</Text> : null}
        </Section>

        <Text style={text}>
          Changed your mind? You can keep it running again at any time before that date.
        </Text>

        {billingUrl ? (
          <Section style={{ margin: "22px 0" }}>
            <Button href={billingUrl} style={button}>
              Manage your storage
            </Button>
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={small}>
          After that date your family keeps its included 5 GB. If your archive is larger, files stay
          readable — you simply cannot add new ones until there is room again.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Your extra storage has been cancelled",
  displayName: "Storage cancelled",
  previewData: {
    endsOn: "October 13, 2026",
    amount: "3.99 USD",
    billingUrl: "https://eternalmemorys.enterprises/upgrade",
  } satisfies TemplateData,
} satisfies TemplateEntry;
