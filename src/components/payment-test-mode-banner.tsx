const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

/** Tells people in the preview that no real money is moving. */
export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        Payments are not live yet — real payments cannot be taken on this site.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-primary/30 bg-primary/10 px-4 py-2 text-center text-sm text-foreground">
        All payments in this preview are test payments — no money is charged.{" "}
        <a
          href="https://docs.lovable.dev/features/payments#test-and-live-environments"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline"
        >
          Read more
        </a>
      </div>
    );
  }
  return null;
}
