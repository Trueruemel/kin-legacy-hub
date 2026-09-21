import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FileSpreadsheet,
  HardDrive,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useServerFn } from "@tanstack/react-start";

import { AppLayout, PageHeader } from "@/components/app-layout";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { StripeCheckoutForm } from "@/components/stripe-embedded-checkout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useActiveFamily } from "@/hooks/use-active-family";
import { EXTRA_STORAGE, formatGb } from "@/lib/products";
import { getFamilyStorage } from "@/lib/storage-quota.functions";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import {
  cancelMySubscription,
  getMyBilling,
  resumeMySubscription,
} from "@/utils/payments.functions";

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

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function UpgradePage() {
  const [open, setOpen] = useState(false);
  const configured = paymentsConfigured();
  const queryClient = useQueryClient();

  const fetchBilling = useServerFn(getMyBilling);
  const cancelFn = useServerFn(cancelMySubscription);
  const resumeFn = useServerFn(resumeMySubscription);

  const { data: billing, isLoading: billingLoading } = useQuery({
    queryKey: ["my-billing"],
    enabled: configured,
    queryFn: () => fetchBilling({ data: { environment: getStripeEnvironment() } }),
  });

  const billingError = billing && "error" in billing ? billing.error : null;
  const storageSubs =
    billing && !("error" in billing)
      ? billing.subscriptions.filter((s) => s.priceId === EXTRA_STORAGE.priceId)
      : [];
  const invoices = billing && !("error" in billing) ? billing.invoices : [];
  const needsCardUpdate = billing && !("error" in billing) ? billing.needsCardUpdate : false;
  // "Paid up" covers a cancelled plan whose month has not run out yet — the
  // same rule the storage limit itself uses.
  const payingSubs = storageSubs.filter(
    (s) =>
      ["active", "trialing", "past_due"].includes(s.status) ||
      (["canceled", "unpaid"].includes(s.status) &&
        !!s.currentPeriodEnd &&
        new Date(s.currentPeriodEnd) > new Date()),
  );

  const { family } = useActiveFamily();
  const fetchStorage = useServerFn(getFamilyStorage);
  const { data: storage } = useQuery({
    queryKey: ["family-storage", family?.id],
    enabled: !!family,
    queryFn: () =>
      fetchStorage({ data: { familyId: family!.id, environment: getStripeEnvironment() } }),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["my-billing"] });
    void queryClient.invalidateQueries({ queryKey: ["family-storage"] });
    void queryClient.invalidateQueries({ queryKey: ["family-plans"] });
  };

  const cancel = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const result = await cancelFn({ data: { subscriptionId, environment: getStripeEnvironment() } });
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success("Your extra storage stops at the end of the month you already paid for.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resume = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const result = await resumeFn({ data: { subscriptionId, environment: getStripeEnvironment() } });
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success("Your extra storage will keep renewing.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const usedPercent = storage
    ? Math.min(100, Math.round((storage.usedBytes / Math.max(1, storage.limitBytes)) * 100))
    : 0;

  return (
    <AppLayout>
      <PaymentTestModeBanner />
      <PageHeader
        title="Extra storage"
        description="More room for the photos, recordings and documents your family keeps."
      />

      {needsCardUpdate ? (
        <Card className="mb-6 max-w-xl border-destructive/40 bg-destructive/5 p-5" role="alert">
          <p className="flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <span>
              A payment for your extra storage did not go through. Your files are safe. Add 30 GB
              again below with a working card, or let the plan lapse — nothing is deleted.
            </span>
          </p>
        </Card>
      ) : null}

      {storage ? (
        <Card className="mb-6 max-w-xl p-6">
          <h2 className="font-display text-lg font-semibold">Your family's room</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatGb(storage.usedBytes)} of {formatGb(storage.limitBytes)} used
            {storage.extraActive ? " — includes extra storage your family pays for" : ""}
          </p>
          <Progress
            value={usedPercent}
            className="mt-4"
            aria-label={`Storage used: ${usedPercent} percent`}
          />
        </Card>
      ) : null}

      <Card className="max-w-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">{EXTRA_STORAGE.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Private storage for your family archive. Cancel any time — your files stay yours.
            </p>
          </div>
          <p className="whitespace-nowrap font-display text-2xl font-semibold">
            {EXTRA_STORAGE.priceLabel}
          </p>
        </div>
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {EXTRA_STORAGE.intervalLabel}
        </p>

        <Separator className="my-5" />

        {!configured ? (
          <p className="text-sm text-muted-foreground">
            Payments are not switched on for this site yet.
          </p>
        ) : (
          <>
            {billingLoading ? (
              <p className="text-sm text-muted-foreground">Loading your purchases…</p>
            ) : billingError ? (
              <p className="text-sm text-destructive">{billingError}</p>
            ) : payingSubs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You have no extra storage yet. Your family starts with 5 GB.
              </p>
            ) : (
              <ul className="space-y-4">
                {payingSubs.map((sub) => {
                  const endsOn = formatDate(sub.currentPeriodEnd);
                  return (
                    <li key={sub.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant={sub.cancelAtPeriodEnd ? "secondary" : "default"}>
                          <HardDrive className="mr-1 size-3" aria-hidden="true" />
                          {sub.cancelAtPeriodEnd ? "Ending" : "Active"}
                        </Badge>
                        <span className="text-muted-foreground">
                          {sub.quantity > 1
                            ? `${sub.quantity} × ${EXTRA_STORAGE.gigabytes} GB`
                            : `${EXTRA_STORAGE.gigabytes} GB`}
                          {sub.amount ? ` · ${sub.amount} ${EXTRA_STORAGE.intervalLabel}` : ""}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {sub.cancelAtPeriodEnd
                          ? endsOn
                            ? `Your extra room stays until ${endsOn}, then the plan ends. Your files stay.`
                            : "This plan ends at the end of the month you paid for."
                          : endsOn
                            ? `Next payment on ${endsOn}.`
                            : "Renews monthly."}
                      </p>
                      <div className="mt-3">
                        {sub.cancelAtPeriodEnd ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={resume.isPending}
                            onClick={() => resume.mutate(sub.id)}
                          >
                            Keep it running
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={cancel.isPending}
                            onClick={() => cancel.mutate(sub.id)}
                          >
                            Cancel at end of month
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-5">
              {open ? (
                <StripeCheckoutForm
                  kind="price"
                  priceId={EXTRA_STORAGE.priceId}
                  returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
                />
              ) : (
                <Button onClick={() => setOpen(true)}>
                  {payingSubs.length > 0
                    ? `Add another ${EXTRA_STORAGE.gigabytes} GB`
                    : `Add ${EXTRA_STORAGE.gigabytes} GB`}
                </Button>
              )}
              {payingSubs.length > 0 && !open ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  You already have extra storage. Adding another block gives your family
                  {` ${EXTRA_STORAGE.gigabytes} GB`} more and is charged separately.
                </p>
              ) : null}
            </div>
          </>
        )}
      </Card>

      {configured && invoices.length > 0 ? <PaymentHistory invoices={invoices} /> : null}
    </AppLayout>
  );
}

type PeriodGroup = {
  key: string;
  label: string;
  invoices: BillingInvoice[];
  totalCents: number;
  currency: string;
};

/** Groups receipts into the billing period (calendar month) they were charged in. */
function groupByPeriod(invoices: BillingInvoice[]): PeriodGroup[] {
  const groups = new Map<string, PeriodGroup>();
  for (const invoice of invoices) {
    const stamp = invoice.periodStart ?? invoice.paidOn;
    const date = stamp ? new Date(stamp) : null;
    const key = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : "unknown";
    const label = date
      ? date.toLocaleDateString(undefined, { year: "numeric", month: "long" })
      : "Date unknown";
    const group =
      groups.get(key) ??
      ({ key, label, invoices: [], totalCents: 0, currency: invoice.currency } as PeriodGroup);
    group.invoices.push(invoice);
    group.totalCents += invoice.amountCents;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function invoiceRows(invoices: BillingInvoice[]): (string | number | null)[][] {
  return [
    ["Receipt", "Date", "Period start", "Period end", "Description", "Amount", "Currency", "Status"],
    ...invoices.map((invoice) => [
      invoice.number ?? invoice.id,
      formatDate(invoice.paidOn) ?? "",
      formatDate(invoice.periodStart) ?? "",
      formatDate(invoice.periodEnd) ?? "",
      invoice.description ?? "",
      (invoice.amountCents / 100).toFixed(2),
      invoice.currency,
      invoice.status ?? "",
    ]),
  ];
}

/** Single receipts to download plus one summary per billing period. */
function PaymentHistory({ invoices }: { invoices: BillingInvoice[] }) {
  const periods = groupByPeriod(invoices);

  return (
    <Card className="mt-6 max-w-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Your payments</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCsv("eternal-memories-receipts.csv", invoiceRows(invoices))}
        >
          <FileSpreadsheet className="size-4" aria-hidden="true" /> Download all
        </Button>
      </div>

      <div className="mt-5 space-y-6">
        {periods.map((period) => (
          <section key={period.key}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <div>
                <h3 className="text-sm font-semibold">{period.label}</h3>
                <p className="text-xs text-muted-foreground">
                  {period.invoices.length} receipt{period.invoices.length === 1 ? "" : "s"} ·{" "}
                  {(period.totalCents / 100).toFixed(2)} {period.currency} in total
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  downloadCsv(
                    `eternal-memories-receipts-${period.key}.csv`,
                    invoiceRows(period.invoices),
                  )
                }
              >
                <FileSpreadsheet className="size-4" aria-hidden="true" /> Period summary
              </Button>
            </div>
            <ul className="mt-3 space-y-3 text-sm">
              {period.invoices.map((invoice) => (
                <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {formatDate(invoice.paidOn) ?? "—"} · {invoice.amount}
                    {invoice.number ? ` · ${invoice.number}` : ""}
                    {invoice.status && invoice.status !== "paid" ? ` · ${invoice.status}` : ""}
                  </span>
                  <span className="flex items-center gap-3">
                    {invoice.pdfUrl ? (
                      <a
                        className="inline-flex items-center gap-1 underline"
                        href={invoice.pdfUrl}
                        download
                      >
                        <Download className="size-3" aria-hidden="true" /> Download receipt
                      </a>
                    ) : null}
                    {invoice.hostedUrl ? (
                      <a
                        className="inline-flex items-center gap-1 underline"
                        href={invoice.hostedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
}
