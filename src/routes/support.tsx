import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useState } from "react";

import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { StripeCheckoutForm } from "@/components/stripe-embedded-checkout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paymentsConfigured } from "@/lib/stripe";

const PRESETS = [5, 10, 25, 50];

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support the developer — Eternal — Memories" },
      {
        name: "description",
        content:
          "A voluntary thank-you contribution that helps keep Eternal — Memories, the private family memory archive, running and growing.",
      },
      { property: "og:title", content: "Support the developer — Eternal — Memories" },
      {
        property: "og:description",
        content: "Give what you like as a thank-you and help keep this family archive going.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const [amount, setAmount] = useState("10");
  const [open, setOpen] = useState(false);
  const cents = Math.round(Number(amount.replace(",", ".")) * 100);
  const valid = Number.isInteger(cents) && cents >= 100 && cents <= 500000;

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <PaymentTestModeBanner />
      <h1 className="mt-8 font-display text-3xl font-semibold">Support the developer</h1>
      <p className="mt-3 text-muted-foreground">
        Eternal — Memories is built by hand for families. If it helped yours, you can leave a
        thank-you of any size. Nothing is unlocked by giving — it simply keeps the work going.
      </p>

      <Card className="mt-8 p-6">
        {!paymentsConfigured() ? (
          <p className="text-sm text-muted-foreground">
            Contributions are not switched on for this site yet.
          </p>
        ) : open ? (
          <StripeCheckoutForm
            kind="donation"
            amountInCents={cents}
            returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={amount === String(value) ? "default" : "outline"}
                  onClick={() => setAmount(String(value))}
                >
                  ${value}
                </Button>
              ))}
            </div>
            <div className="mt-5 grid gap-2">
              <Label htmlFor="amount">Your amount in US dollars</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-describedby="amount-hint"
              />
              <p id="amount-hint" className="text-xs text-muted-foreground">
                Between $1 and $5,000.
              </p>
            </div>
            <Button className="mt-5" disabled={!valid} onClick={() => setOpen(true)}>
              <Heart className="mr-2 size-4" /> Give ${valid ? (cents / 100).toFixed(2) : "—"}
            </Button>
          </>
        )}
      </Card>

      <p className="mt-8 text-sm">
        <Link to="/" className="underline">
          Back to the homepage
        </Link>
      </p>
    </main>
  );
}
