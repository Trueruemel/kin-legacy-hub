import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";

import {
  createStripeClient,
  getStripeErrorMessage,
  type StripeEnv,
} from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };

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

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      priceId: string;
      quantity?: number;
      customerEmail?: string;
      userId?: string;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
      return data;
    },
  )
  .handler(async ({ data }): Promise<CheckoutSessionResult> => {
    try {
      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const stripePrice = prices.data[0];
      if (!stripePrice) throw new Error("Price not found");
      const isRecurring = stripePrice.type === "recurring";

      const customerId =
        data.customerEmail || data.userId
          ? await resolveOrCreateCustomer(stripe, {
              ...(data.customerEmail && { email: data.customerEmail }),
              ...(data.userId && { userId: data.userId }),
            })
          : undefined;

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
        ...(customerId && { customer: customerId }),
        ...(!isRecurring && { payment_intent_data: { description: productDescription } }),
        managed_payments: { enabled: true },
        metadata: {
          ...(data.userId && { userId: data.userId }),
          managed_payments: "true",
        },
        ...(data.userId &&
          isRecurring && { subscription_data: { metadata: { userId: data.userId } } }),
      } as Stripe.Checkout.SessionCreateParams);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Pay-what-you-want thank-you contribution for the developer. */
export const createDonationCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      amountInCents: number;
      customerEmail?: string;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      if (!Number.isInteger(data.amountInCents) || data.amountInCents < 100) {
        throw new Error("Please choose at least $1.00");
      }
      if (data.amountInCents > 500000) throw new Error("Please choose $5,000 or less");
      return data;
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
              product_data: { name: "Support the developer" },
              unit_amount: data.amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        payment_intent_data: { description: "Support the developer" },
        ...(data.customerEmail && { customer_email: data.customerEmail }),
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
