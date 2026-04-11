import crypto from "node:crypto";

export type PaymentProviderName = "stripe" | "paypal" | "mock";

export interface CheckoutInput {
  productId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  traceId: string;
}

export interface PaymentProvider {
  checkout(input: CheckoutInput): Promise<CheckoutResult>;
}

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly traceId: string
  ) {
    super(message);
  }
}

class MockProvider implements PaymentProvider {
  async checkout(input: CheckoutInput): Promise<CheckoutResult> {
    const traceId = crypto.randomUUID();
    return {
      checkoutUrl: `${input.successUrl}?trace=${traceId}&product=${encodeURIComponent(input.productId)}`,
      traceId
    };
  }
}

export function usePayment(provider: PaymentProvider = new MockProvider()) {
  async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
    try {
      return await provider.checkout(input);
    } catch {
      const traceId = crypto.randomUUID();
      throw new DomainError("PAY_ERR_PROVIDER", "支付失败，请稍后重试", traceId);
    }
  }

  return { checkout };
}
