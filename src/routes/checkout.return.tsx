import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import { getCheckoutStatus } from "@/utils/payments.functions";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({
    meta: [
      { title: "Payment complete — Eternal — Memories" },
      {
        name: "description",
        content: "Confirmation page after a storage upgrade or a contribution to Eternal — Memories.",
      },
      { property: "og:title", content: "Payment complete — Eternal — Memories" },
      {
        property: "og:description",
        content: "Thank you — your storage upgrade or contribution has been received.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string | undefined } => ({
    session_id: typeof search["session_id"] === "string" ? search["session_id"] : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();
  const checkStatus = useServerFn(getCheckoutStatus);
  const queryClient = useQueryClient();
  const canCheck = !!sessionId && paymentsConfigured();

  const { data, isLoading } = useQuery({
    queryKey: ["checkout-status", sessionId],
    enabled: canCheck,
    retry: 1,
    queryFn: () =>
      checkStatus({ data: { sessionId: sessionId as string, environment: getStripeEnvironment() } }),
  });

  const paid = !!data && !("error" in data) && data.paid;
  const pending = !!data && !("error" in data) && !data.paid && data.status !== "expired";

  // Once the payment is confirmed, the storage figures on other pages are stale.
  useEffect(() => {
    if (!paid) return;
    void queryClient.invalidateQueries({ queryKey: ["family-storage"] });
    void queryClient.invalidateQueries({ queryKey: ["my-billing"] });
    void queryClient.invalidateQueries({ queryKey: ["family-plans"] });
  }, [paid, queryClient]);

  const title = !sessionId
    ? "Nothing to show yet"
    : isLoading
      ? "Checking your payment…"
      : paid
        ? "Thank you."
        : pending
          ? "Your payment is still being confirmed"
          : "We could not confirm this payment";

  const body = !sessionId
    ? "We could not find a payment for this page. If you just paid, check your inbox for the receipt."
    : isLoading
      ? "One moment while we confirm this with our payment provider."
      : paid
        ? `Your payment${
            data && !("error" in data) && data.amount ? ` of ${data.amount}` : ""
          } went through. Extra storage is added to your family archive right away, and contributions go straight to keeping this project going. A receipt is on its way by email.`
        : pending
          ? "Some payment methods take a little while to settle. You will get a receipt by email as soon as it clears — nothing more is needed from you."
          : "This payment was not completed. Nothing has been charged. You can try again whenever you like.";

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <Card className="p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
          {body}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/dashboard">Back to your family</Link>
          </Button>
          {!paid && !isLoading ? (
            <Button asChild variant="outline">
              <Link to="/upgrade">Manage storage</Link>
            </Button>
          ) : null}
        </div>
      </Card>
    </main>
  );
}

