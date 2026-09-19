import { EsewaError } from './errors';
import { isEsewaInstalled, pay } from './esewa';
import { runPaymentFlow } from './flow';
import type { PaymentFlowOptions, PaymentFlowResult, PaymentState, PollOptions } from './flow';
import type { EsewaFlow } from './types';
import { usePaymentFlow } from './usePaymentFlow';
import type { UsePaymentFlowResult } from './usePaymentFlow';

/** Tells `initiate` which eSewa flow the device will use, so the server books the right one. */
export interface EsewaInitiateContext {
  flow: EsewaFlow;
}

/** What your server returns from `initiate`: the Intent `deeplink`, or the ePay form URL. */
export interface EsewaInitiateResult {
  /** The `deeplink` from eSewa's booking response. Required when `context.flow` is `intent`. */
  deeplink?: string;
  /** Your server URL that auto-submits the signed ePay form. Required when `context.flow` is `epay`. */
  epayUrl?: string;
}

/** The initiated payment, including the flow that was chosen. */
export interface EsewaInitiation extends EsewaInitiateResult {
  flow: EsewaFlow;
}

export interface EsewaPaymentOptions
  extends PollOptions,
    Partial<
      Pick<
        PaymentFlowOptions<EsewaInitiation>,
        'onSuccess' | 'onCancel' | 'onError' | 'onStatus' | 'maxVerifyErrors'
      >
    > {
  /** Step 1. Ask your server to book (Intent) or sign (ePay) the payment for `context.flow`. */
  initiate: (context: EsewaInitiateContext) => Promise<EsewaInitiateResult>;
  /**
   * Step 3. Ask your server whether the payment finished. Required: eSewa gives the device no proof
   * of payment, so only your server's status check can say.
   */
  verify: () => Promise<PaymentState>;
  /** `auto` (default) uses Intent when the eSewa app is installed, otherwise ePay. */
  flow?: EsewaFlow | 'auto';
  /** Deep link prefix your ePay `success_url` / `failure_url` return to, for example `myapp://esewa`. */
  returnPrefix?: string;
  /** Opens the ePay page. Defaults to the system browser. */
  openUrl?: (url: string) => Promise<unknown>;
}

async function resolveFlow(requested: EsewaFlow | 'auto'): Promise<EsewaFlow> {
  if (requested !== 'auto') return requested;
  const installed = await isEsewaInstalled().catch(() => false);
  return installed ? 'intent' : 'epay';
}

/**
 * Builds the generic flow for eSewa: choose Intent or ePay, `initiate`, open eSewa, then `verify`.
 * Use it directly with `runPaymentFlow` / `usePaymentFlow`, or through the two helpers below.
 */
export function createEsewaFlow(options: EsewaPaymentOptions): PaymentFlowOptions<EsewaInitiation> {
  return {
    ...options,
    initiate: async () => {
      const flow = await resolveFlow(options.flow ?? 'auto');
      const result = await options.initiate({ flow });
      return { ...result, flow };
    },
    present: (initiation) =>
      pay({
        flow: initiation.flow,
        intent: initiation.deeplink ? { deeplink: initiation.deeplink } : undefined,
        epay: initiation.epayUrl
          ? { url: initiation.epayUrl, returnPrefix: options.returnPrefix, openUrl: options.openUrl }
          : undefined,
        signal: options.signal,
      }),
    verify: options.verify,
    isCancelled: (error) => error instanceof EsewaError && error.isCancelled,
  };
}

/**
 * Runs a complete eSewa payment: `initiate`, open eSewa, then poll `verify` until it settles.
 * Resolves with how it ended (`success`, `failed`, `cancelled` or `timeout`).
 */
export function processEsewaPayment(options: EsewaPaymentOptions): Promise<PaymentFlowResult<EsewaInitiation>> {
  return runPaymentFlow(createEsewaFlow(options));
}

/** React hook for a complete eSewa payment. `start()` runs the flow; `status` tracks it. */
export function useEsewaPayment(options: EsewaPaymentOptions): UsePaymentFlowResult<EsewaInitiation> {
  return usePaymentFlow(createEsewaFlow(options));
}
