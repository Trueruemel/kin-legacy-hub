import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search["session_id"] === "string" ? search["session_id"] : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <Card className="p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">
          {sessionId ? "Thank you." : "Nothing to show yet"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {sessionId
            ? "Your payment went through. Extra storage is added to your family archive right away, and contributions go straight to keeping this project going."
            : "We could not find a payment for this page. If you just paid, check your inbox for the receipt."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link to="/dashboard">Back to your family</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
