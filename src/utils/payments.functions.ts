import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DONATION } from "@/lib/products";
import {
  createStripeClient,
  getStripeErrorMessage,
  type StripeEnv,
} from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Finds the customer by our own user id (searchable metadata), then by email,
 * and only creates a new one as a last resort — so repeat purchases stay on
 * one customer record.
 */
async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length && found.data[0]) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

/**
 * Starts a purchase for the signed-in person only. The buyer's identity comes
 * from the verified session, never from the browser, so nobody can attach a
 * payment to somebody else's account.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      priceId: string;
      quantity?: number;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
      if (data.quantity !== undefined && (!Number.isInteger(data.quantity) || data.quantity < 1)) {
        throw new Error("Invalid quantity");
      }
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const userId = context.userId;
      const email =
        typeof context.claims["email"] === "string"
          ? (context.claims["email"] as string)
          : undefined;

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const stripePrice = prices.data[0];
      if (!stripePrice) throw new Error("Price not found");
      const isRecurring = stripePrice.type === "recurring";

      const customerId = await resolveOrCreateCustomer(stripe, {
        ...(email && { email }),
        userId,
      });

      let productDescription: string | undefined;
      if (!isRecurring) {
        const productId =
          typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product.id;
        const product = await stripe.products.retrieve(productId);
        productDescription = product.name;
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        ...(!isRecurring && { payment_intent_data: { description: productDescription } }),
        managed_payments: { enabled: true },
        metadata: { userId, managed_payments: "true" },
        ...(isRecurring && { subscription_data: { metadata: { userId } } }),
      } as Stripe.Checkout.SessionCreateParams);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/**
 * Pay-what-you-want thank-you contribution. Open to visitors who are not
 * signed in, so an email address is required to be able to send the receipt.
 */
export const createDonationCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      amountInCents: number;
      customerEmail: string;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      if (!Number.isInteger(data.amountInCents) || data.amountInCents < DONATION.minCents) {
        throw new Error("Please choose at least $1.00");
      }
      if (data.amountInCents > DONATION.maxCents) throw new Error("Please choose $5,000 or less");
      const email = (data.customerEmail ?? "").trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email)) {
        throw new Error("Please enter an email address so we can send your receipt.");
      }
      return { ...data, customerEmail: email };
    },
  )
  .handler(async ({ data }): Promise<CheckoutSessionResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: DONATION.label },
              unit_amount: data.amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        payment_intent_data: { description: DONATION.label },
        customer_email: data.customerEmail,
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export type CheckoutOutcome =
  | {
      status: "complete" | "open" | "expired";
      paid: boolean;
      mode: "payment" | "subscription" | "setup" | null;
      amount: string | null;
      description: string | null;
    }
  | { error: string };

/** Confirms on the thank-you page that a payment really did go through. */
export const getCheckoutStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) => {
    if (!/^cs_[a-zA-Z0-9_]+$/.test(data.sessionId)) throw new Error("Invalid session id");
    return data;
  })
  .handler(async ({ data }): Promise<CheckoutOutcome> => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      const paid =
        session.payment_status === "paid" || session.payment_status === "no_payment_required";
      const amount =
        session.amount_total != null
          ? `${(session.amount_total / 100).toFixed(2)} ${(session.currency ?? "usd").toUpperCase()}`
          : null;
      return {
        status: (session.status ?? "open") as "complete" | "open" | "expired",
        paid,
        mode: (session.mode ?? null) as "payment" | "subscription" | "setup" | null,
        amount,
        description: session.mode === "subscription" ? "Extra storage" : DONATION.label,
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export type BillingSubscription = {
  id: string;
  priceId: string | null;
  status: string;
  quantity: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  amount: string | null;
};

export type BillingInvoice = {
  id: string;
  status: string | null;
  amount: string;
  paidOn: string | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
};

export type MyBilling = {
  subscriptions: BillingSubscription[];
  invoices: BillingInvoice[];
  needsCardUpdate: boolean;
};

function money(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null) return null;
  return `${(amount / 100).toFixed(2)} ${(currency ?? "usd").toUpperCase()}`;
}

function priceKeyOf(price: Stripe.Price | null | undefined): string | null {
  return price?.lookup_key ?? price?.metadata?.["lovable_external_id"] ?? price?.id ?? null;
}

/** Everything the signed-in person needs to manage their own purchases. */
export const getMyBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<MyBilling | { error: string }> => {
    try {
      const stripe = createStripeClient(data.environment);
      const userId = context.userId;

      const found = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 10,
      });
      const customerIds = found.data.map((c) => c.id);
      if (customerIds.length === 0) {
        return { subscriptions: [], invoices: [], needsCardUpdate: false };
      }

      const subscriptions: BillingSubscription[] = [];
      const invoices: BillingInvoice[] = [];

      for (const customerId of customerIds) {
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 20,
        });
        for (const sub of subs.data) {
          if (sub.status === "incomplete_expired") continue;
          const item = sub.items?.data?.[0];
          const periodEnd =
            item?.current_period_end ??
            (sub as unknown as { current_period_end?: number }).current_period_end;
          subscriptions.push({
            id: sub.id,
            priceId: priceKeyOf(item?.price),
            status: sub.status,
            quantity: item?.quantity ?? 1,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
            amount: money(item?.price?.unit_amount, item?.price?.currency),
          });
        }

        const list = await stripe.invoices.list({ customer: customerId, limit: 20 });
        for (const inv of list.data) {
          invoices.push({
            id: inv.id ?? "",
            status: inv.status ?? null,
            amount: money(inv.amount_paid || inv.amount_due, inv.currency) ?? "",
            paidOn: inv.created ? new Date(inv.created * 1000).toISOString() : null,
            pdfUrl: inv.invoice_pdf ?? null,
            hostedUrl: inv.hosted_invoice_url ?? null,
          });
        }
      }

      subscriptions.sort((a, b) => (b.currentPeriodEnd ?? "").localeCompare(a.currentPeriodEnd ?? ""));
      invoices.sort((a, b) => (b.paidOn ?? "").localeCompare(a.paidOn ?? ""));

      return {
        subscriptions,
        invoices,
        needsCardUpdate: subscriptions.some((s) => s.status === "past_due" || s.status === "unpaid"),
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Makes sure this subscription really belongs to the signed-in person. */
async function assertOwnSubscription(
  stripe: ReturnType<typeof createStripeClient>,
  subscriptionId: string,
  userId: string,
): Promise<Stripe.Subscription> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (sub.metadata?.["userId"] === userId) return sub;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!("deleted" in customer) && customer.metadata?.["userId"] === userId) return sub;
  }
  throw new Error("This purchase does not belong to your account.");
}

/**
 * Stops a monthly purchase at the end of the month already paid for. Files and
 * the extra room stay until that date.
 */
export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subscriptionId: string; environment: StripeEnv }) => {
    if (!/^sub_[a-zA-Z0-9_]+$/.test(data.subscriptionId)) throw new Error("Invalid subscription");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    try {
      const stripe = createStripeClient(data.environment);
      await assertOwnSubscription(stripe, data.subscriptionId, context.userId);
      await stripe.subscriptions.update(data.subscriptionId, { cancel_at_period_end: true });
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Undoes a cancellation while the paid month is still running. */
export const resumeMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subscriptionId: string; environment: StripeEnv }) => {
    if (!/^sub_[a-zA-Z0-9_]+$/.test(data.subscriptionId)) throw new Error("Invalid subscription");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    try {
      const stripe = createStripeClient(data.environment);
      await assertOwnSubscription(stripe, data.subscriptionId, context.userId);
      await stripe.subscriptions.update(data.subscriptionId, { cancel_at_period_end: false });
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
