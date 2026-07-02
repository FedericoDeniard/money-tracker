import { useEffect, useState } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { getConfig } from "../../config";
import { useTranslation } from "react-i18next";

// client-side mp card tokenization via CardPayment Brick.
//
// flow:
//   1. parent opens the modal containing this component.
//   2. on mount we init the mp sdk with the public key from /api/config.
//   3. <CardPayment> renders the entire checkout form inside an
//      mp-managed iframe: cardholder name, identification, card
//      number, expiration, security code, and email. the user fills
//      it in directly inside the iframe. none of the card data
//      touches our origin (PCI compliance).
//   4. when the user clicks the form's submit button, mp calls
//      onSubmit with a payload that contains the `token` field
//      (the card_token_id). we forward that to the parent via
//      the onTokenized prop.
//   5. parent posts the card_token_id to
//      /functions/v1/create-subscription which creates the
//      preapproval in authorized status with external_reference =
//      our user.id. mp charges the card immediately and the
//      subscription_preapproval webhook handler stamps user_id on
//      payments.subscriptions.
export interface MpCardCheckoutProps {
  /** amount in major units (e.g. 10000 for $10000). */
  amount: number;
  /** currency code (e.g. "ARS"). */
  currency: string;
  /** called with the card_token_id once mp has tokenized the card. */
  onTokenized: (cardTokenId: string) => void;
  /** called when mp reports an error. */
  onError?: (error: unknown) => void;
}

export function MpCardCheckout({
  amount,
  currency,
  onTokenized,
  onError,
}: MpCardCheckoutProps) {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const config = await getConfig();
      if (cancelled) return;
      if (!config.mercadopagoPublicKey) {
        console.error("[billing] mercadopagoPublicKey missing in /api/config");
        onError?.(new Error("MP public key not configured"));
        return;
      }
      try {
        await initMercadoPago(config.mercadopagoPublicKey, { locale: "es-AR" });
        if (!cancelled) {
          setReady(true);
          console.info("[billing] mercado pago initialized");
        }
      } catch (err) {
        console.error("[billing] initMercadoPago failed", err);
        onError?.(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  if (!ready) {
    return (
      <div className="p-4 text-sm text-[var(--text-secondary)]">
        {t("accountBilling.brick.loading")}
      </div>
    );
  }

  return (
    <CardPayment
      initialization={{ amount, currency }}
      customization={{
        visual: { style: { theme: "default" } },
        paymentMethods: {
          creditCard: "all",
          debitCard: "all",
        },
      }}
      onSubmit={async (cardFormData: unknown) => {
        // mp's onSubmit payload for CardPayment includes a FormData-
        // like object. the card_token_id is in `token` (or
        // available via cardFormData.get("token") on FormData). we
        // log the shape to verify and pull the token.
        const fd = cardFormData as
          | FormData
          | { token?: string; [k: string]: unknown };
        let token: string | undefined;
        if (fd instanceof FormData) {
          token = fd.get("token")?.toString();
        } else {
          token = fd.token;
        }
        console.info("[billing] card payment submitted", {
          hasToken: Boolean(token),
          tokenLength: token?.length,
        });
        if (!token) {
          console.error(
            "[billing] card payment returned no token. keys:",
            fd instanceof FormData ? "FormData" : Object.keys(fd as object)
          );
          onError?.(new Error("Card payment returned no token"));
          return;
        }
        onTokenized(token);
      }}
      onError={error => {
        console.error("[billing] card payment brick error", error);
        onError?.(error);
      }}
      onReady={() => {
        console.info("[billing] card payment brick ready");
      }}
    />
  );
}
