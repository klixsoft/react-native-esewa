import type { EpayResponse } from './epay.ts';

export type EsewaFlow = 'intent' | 'epay';

export interface EsewaIntentOptions {
  /**
   * The `deeplink` your server received from eSewa's *book payment* call, for example
   * `https://rc-links.esewa.com.np/pay/<booking_id>`.
   */
  deeplink: string;
}

export interface EsewaEpayOptions {
  /**
   * A URL on **your server** that auto-submits the signed ePay v2 form to eSewa. The form must be
   * signed server-side because it needs your secret key.
   */
  url: string;
  /**
   * Deep link scheme/prefix your `success_url` and `failure_url` redirect back to, for example
   * `myapp://esewa`. When set, the return is detected from the deep link.
   */
  returnPrefix?: string;
  /**
   * Opens the URL. Defaults to the system browser through `Linking`. Pass a function backed by an
   * in-app browser (Custom Tabs / SFSafariViewController) for a better experience.
   */
  openUrl?: (url: string) => Promise<unknown>;
}

export interface EsewaPayOptions {
  /**
   * `intent` opens the eSewa app, `epay` uses the hosted web form. Omit it (or pass `auto`) to use
   * Intent when the eSewa app is installed and an `intent` option was given, otherwise ePay.
   */
  flow?: EsewaFlow | 'auto';
  intent?: EsewaIntentOptions;
  epay?: EsewaEpayOptions;
  /** How long to wait for the user to come back. Defaults to 15 minutes. */
  timeoutMs?: number;
  /** Abort the wait (for example when the screen unmounts). */
  signal?: { aborted: boolean };
}

/**
 * What happened on the device. This is **never proof of payment**: eSewa reports the outcome to your
 * server, so confirm with your backend (see `pollPaymentState`).
 */
export interface EsewaPayResult {
  flow: EsewaFlow;
  /** The URL the user returned through, when the flow used a deep link. */
  returnUrl?: string;
  /** The decoded, **unverified** ePay v2 payload, when the return URL carried one. */
  epay?: EpayResponse;
}
