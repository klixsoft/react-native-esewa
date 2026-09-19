import { isPaymentFlowError } from './flow';
import type { PaymentFlowError } from './flow';

/** Stable, machine readable error codes. Match on these, never on `message`. */
export const EsewaErrorCode = {
  /** The eSewa app is not installed (Intent flow). */
  NotInstalled: 'E_NOT_INSTALLED',
  /** The link could not be opened. */
  OpenFailed: 'E_OPEN_FAILED',
  /** Nothing to do: the options did not include a usable flow. */
  NoFlow: 'E_NO_FLOW',
  /** The user did not come back within the time limit. */
  Timeout: 'E_TIMEOUT',
  /** The wait was aborted by the caller. */
  Aborted: 'E_ABORTED',
  /** A required option was missing or invalid. */
  InvalidArguments: 'E_INVALID_ARGUMENTS',
  /** The ePay response could not be parsed. */
  InvalidResponse: 'E_INVALID_RESPONSE',
  /** The native module is not linked (rebuild the app after installing). */
  NotLinked: 'E_NOT_LINKED',
} as const;

export type EsewaErrorCodeValue = (typeof EsewaErrorCode)[keyof typeof EsewaErrorCode];

export class EsewaError extends Error {
  override readonly name = 'EsewaError';
  readonly code: EsewaErrorCodeValue;

  constructor(code: EsewaErrorCodeValue, message: string) {
    super(message);
    this.code = code;
  }

  /** True when the user did not complete the payment: they never came back, or it was aborted. */
  get isCancelled(): boolean {
    return this.code === EsewaErrorCode.Timeout || this.code === EsewaErrorCode.Aborted;
  }
}

/** Type guard for {@link EsewaError}. */
export function isEsewaError(error: unknown): error is EsewaError {
  return error instanceof EsewaError;
}

/**
 * The eSewa error behind a flow error, when the failure came from the eSewa step (its `cause`).
 * Use it to branch on eSewa-specific `code`s after `runPaymentFlow`, `use...Payment` or `onError`.
 */
export function getEsewaError(error: PaymentFlowError | null | undefined): EsewaError | undefined {
  return isPaymentFlowError(error) && error.cause instanceof EsewaError ? error.cause : undefined;
}
