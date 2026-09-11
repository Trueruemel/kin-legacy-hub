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

interface StorageReceiptProps {
  amount?: string;
  renewsOn?: string;
  paidOn?: string;
  settingsUrl?: string;
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
const hr = { borderColor: "#e6e1d7", margin: "28px 0 16px" };
const footer = {
  margin: 0,
  fontSize: "12px",
  lineHeight: "20px",
  color: "#8a8578",
  fontFamily: "Arial, sans-serif",
};

const StorageReceiptEmail = ({
  amount = "$3.99 per month",
  renewsOn,
  paidOn,
  settingsUrl,
}: StorageReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your family archive now has 30 GB of extra room</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={kicker}>Eternal — Memories</Text>
        <Heading style={heading}>Thank you — your extra storage is on</Heading>
        <Text style={text}>
          Your family archive just gained 30 GB of extra private room for photos, recordings and
          documents. It is available right away.
        </Text>

        <Section style={card}>
          <Text style={detail}>
            <strong>30 GB extra storage</strong>
          </Text>
          <Text style={detail}>{amount}</Text>
          {renewsOn ? <Text style={detail}>Renews {renewsOn}</Text> : null}
        </Section>

        <Text style={text}>
          You can stop it whenever you like. If you do, the extra room stays available until the
          month you have already paid for has ended — nothing is deleted.
        </Text>

        {settingsUrl ? (
          <Section style={{ margin: "20px 0" }}>
            <Button href={settingsUrl} style={button}>
              See your storage
            </Button>
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>Sent from your private archive on Eternal — Memories.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: StorageReceiptEmail,
  subject: "Your extra storage is active — Eternal — Memories",
  displayName: "Extra storage receipt",
  previewData: {
    amount: "$3.99 per month",
    renewsOn: "October 10, 2026",
    settingsUrl: "https://eternalmemorys.enterprises/upgrade",
  } satisfies TemplateData,
} satisfies TemplateEntry;
