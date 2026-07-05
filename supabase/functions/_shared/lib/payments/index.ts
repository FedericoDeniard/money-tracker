// provider registry. add new providers here as they are integrated.

import type { PaymentProvider, ProviderName } from "./types.ts";
import { MercadoPagoProvider } from "./mercadopago/client.ts";

const providers: Record<ProviderName, PaymentProvider> = {
  mercadopago: new MercadoPagoProvider(),
};

export function getProvider(name: string): PaymentProvider | null {
  return providers[name as ProviderName] ?? null;
}

export function isKnownProvider(name: string): name is ProviderName {
  return name in providers;
}
