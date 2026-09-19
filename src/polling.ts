import { EsewaError, EsewaErrorCode } from './errors';

/** What your server reports for an eSewa payment. Map your own API onto these. */
export type EsewaPaymentState = 'success' | 'failed' | 'pending';

export interface PollOptions {
  /** Delay between checks. Defaults to 3000 ms. */
  intervalMs?: number;
  /** Give up after this long. Defaults to 120000 ms. */
  timeoutMs?: number;
  /** Abort the wait (for example when the screen unmounts). */
  signal?: { aborted: boolean };
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable for tests. */
  now?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Asks **your server** for the payment state until it is final. `check` should call your backend,
 * which in turn checks eSewa's status API. Resolves with `'success'` or `'failed'`; rejects with
 * `E_TIMEOUT` if it stays `'pending'` and `E_ABORTED` when `signal.aborted` becomes true.
 */
export async function pollPaymentState(
  check: () => Promise<EsewaPaymentState>,
  options: PollOptions = {}
): Promise<Exclude<EsewaPaymentState, 'pending'>> {
  const intervalMs = options.intervalMs ?? 3000;
  const timeoutMs = options.timeoutMs ?? 120000;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const startedAt = now();

  for (;;) {
    if (options.signal?.aborted) {
      throw new EsewaError(EsewaErrorCode.Aborted, 'Waiting for the payment was aborted.');
    }

    const state = await check();
    if (state === 'success' || state === 'failed') return state;

    if (now() - startedAt + intervalMs > timeoutMs) {
      throw new EsewaError(EsewaErrorCode.Timeout, 'The payment did not reach a final state in time.');
    }
    await sleep(intervalMs);
  }
}
