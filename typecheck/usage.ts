import { getEsewaError, processEsewaPayment, type EsewaInitiateResult } from '../src';

export async function flowIsTyped(): Promise<string> {
  const result = await processEsewaPayment({
    flow: 'auto',
    initiate: async ({ flow }): Promise<EsewaInitiateResult> =>
      flow === 'intent' ? { deeplink: 'https://links.esewa.com.np/pay/1' } : { epayUrl: 'https://api.example.com/f' },
    verify: async () => 'pending',
  });

  if (result.outcome === 'success') return result.initiation.flow;
  if (result.outcome === 'failed') return getEsewaError(result.error)?.code ?? result.error.code;
  return result.outcome;
}

// @ts-expect-error at least one of `deeplink` / `epayUrl` is required
export const empty: EsewaInitiateResult = {};

// @ts-expect-error `verify` is required for eSewa
processEsewaPayment({ initiate: async () => ({ deeplink: 'x' }) });
