import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useMemo } from "react";

import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession, createDonationCheckout } from "@/utils/payments.functions";

type CommonProps = {
  customerEmail?: string;
  returnUrl?: string;
};

type Props =
  | (CommonProps & { kind: "price"; priceId: string; userId?: string })
  | (CommonProps & { kind: "donation"; amountInCents: number });

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
                  amountInCents: props.amountInCents,
                  ...(props.customerEmail && { customerEmail: props.customerEmail }),
                  returnUrl,
                  environment,
                },
              })
            : await createCheckoutSession({
                data: {
                  priceId: props.priceId,
                  quantity: 1,
                  ...(props.customerEmail && { customerEmail: props.customerEmail }),
                  ...(props.userId && { userId: props.userId }),
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
