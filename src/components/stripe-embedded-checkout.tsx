import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useMemo } from "react";

import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession, createDonationCheckout } from "@/utils/payments.functions";

type Props =
  | { kind: "price"; priceId: string; returnUrl?: string }
  | { kind: "donation"; amountDollars: number; customerEmail: string; returnUrl?: string };

/** Renders the payment form inline — never a redirect to an external page. */
export function StripeCheckoutForm(props: Props) {
  const options = useMemo(
    () => ({
      fetchClientSecret: async (): Promise<string> => {
        const returnUrl = props.returnUrl || window.location.href;
        const environment = getStripeEnvironment();
        const result =
          props.kind === "donation"
            ? await createDonationCheckout({
                data: {
                  amountDollars: props.amountDollars,
                  customerEmail: props.customerEmail,
                  returnUrl,
                  environment,
                },
              })
            : await createCheckoutSession({
                data: {
                  priceId: props.priceId,
                  returnUrl,
                  environment,
                },
              });
        if ("error" in result) throw new Error(result.error);
        if (!result.clientSecret) throw new Error("No payment session was returned");
        return result.clientSecret;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div id="checkout" className="mt-6">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
