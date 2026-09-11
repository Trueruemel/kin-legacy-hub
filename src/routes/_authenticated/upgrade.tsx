import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HardDrive } from "lucide-react";
import { useState } from "react";

import { useServerFn } from "@tanstack/react-start";

import { AppLayout, PageHeader } from "@/components/app-layout";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { StripeCheckoutForm } from "@/components/stripe-embedded-checkout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";

const STORAGE_PRICE_ID = "extra_storage_30gb_monthly";

export const Route = createFileRoute("/_authenticated/upgrade")({
  head: () => ({
    meta: [
      { title: "Extra storage — Eternal — Memories" },
      {
        name: "description",
        content:
          "Add 30 GB of private storage to your family archive for $3.99 a month, cancel whenever you like.",
      },
      { property: "og:title", content: "Extra storage — Eternal — Memories" },
      {
        property: "og:description",
        content: "Add 30 GB of private storage for your family's photos, recordings and documents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UpgradePage,
});

function UpgradePage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: active } = useQuery({
    queryKey: ["storage-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status,current_period_end,cancel_at_period_end")
        .eq("user_id", user!.id)
        .eq("environment", getStripeEnvironment())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const isActive =
    !!active && ["active", "trialing", "past_due"].includes(active.status as string);

  return (
    <AppLayout>
      <PaymentTestModeBanner />
      <PageHeader
        title="Extra storage"
        description="More room for the photos, recordings and documents your family keeps."
      />

      <Card className="max-w-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">30 GB extra storage</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Private storage for your family archive. Cancel any time — your files stay yours.
            </p>
          </div>
          <p className="whitespace-nowrap font-display text-2xl font-semibold">$3.99</p>
        </div>
        <p className="mt-1 text-right text-xs text-muted-foreground">per month</p>

        <Separator className="my-5" />

        {isActive ? (
          <div className="flex items-center gap-2 text-sm">
            <Badge>
              <HardDrive className="mr-1 size-3" /> Active
            </Badge>
            <span className="text-muted-foreground">
              {active?.current_period_end
                ? `Renews ${new Date(active.current_period_end as string).toLocaleDateString()}`
                : "Your extra storage is active."}
            </span>
          </div>
        ) : !paymentsConfigured() ? (
          <p className="text-sm text-muted-foreground">
            Payments are not switched on for this site yet.
          </p>
        ) : open ? (
          <StripeCheckoutForm
            kind="price"
            priceId={STORAGE_PRICE_ID}
            {...(user?.email ? { customerEmail: user.email } : {})}
            {...(user?.id ? { userId: user.id } : {})}
            returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
          />
        ) : (
          <Button onClick={() => setOpen(true)}>Add 30 GB</Button>
        )}
      </Card>
    </AppLayout>
  );
}
