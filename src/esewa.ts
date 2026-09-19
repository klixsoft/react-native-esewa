import { AppState, Linking } from 'react-native';
import type { AppStateStatus, EmitterSubscription } from 'react-native';

import NativeEsewa from './NativeEsewa';
import { parseEpayReturnUrl } from './epay';
import { EsewaError, EsewaErrorCode } from './errors';
import type { EsewaPayOptions, EsewaPayResult } from './types';

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

function requireNative() {
  if (!NativeEsewa) {
    throw new EsewaError(
      EsewaErrorCode.NotLinked,
      '@klixsoft/react-native-esewa is not linked. Rebuild the app (pod install on iOS, a Gradle build on Android) and make sure the New Architecture is enabled.'
    );
  }
  return NativeEsewa;
}

function requireUrl(name: string, value: string | undefined): string {
  const text = value?.trim();
  if (!text) throw new EsewaError(EsewaErrorCode.InvalidArguments, `\`${name}\` is required.`);
  return text;
}

/** True when the native module is linked. The eSewa app itself is checked with `isEsewaInstalled`. */
export function isAvailable(): boolean {
  return NativeEsewa != null;
}

/** True when the eSewa app is installed on this device. */
export async function isEsewaInstalled(): Promise<boolean> {
  return requireNative().isInstalled();
}

/** Opens the eSewa listing in the Play Store / App Store. */
export async function openEsewaStore(): Promise<boolean> {
  return requireNative().openStore();
}

interface ReturnWait {
  promise: Promise<string | undefined>;
  cancel: () => void;
}

/**
 * Resolves when the user comes back to the app: through a deep link that starts with `prefix`
 * (resolves with that URL), or, when `watchForeground` is set, when the app returns to the
 * foreground (resolves `undefined`).
 */
function waitForReturn(options: {
  prefix?: string;
  watchForeground: boolean;
  timeoutMs: number;
  signal?: { aborted: boolean };
}): ReturnWait {
  let cleanup = () => {};

  const promise = new Promise<string | undefined>((resolve, reject) => {
    let wentAway = false;
    let settled = false;
    const subscriptions: EmitterSubscription[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abortTimer: ReturnType<typeof setInterval> | undefined;

    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      action();
    };

    cleanup = () => {
      subscriptions.forEach((subscription) => subscription.remove());
      if (timer) clearTimeout(timer);
      if (abortTimer) clearInterval(abortTimer);
    };

    subscriptions.push(
      Linking.addEventListener('url', ({ url }) => {
        if (!options.prefix || url.startsWith(options.prefix)) {
          finish(() => resolve(url));
        }
      })
    );

    if (options.watchForeground) {
      subscriptions.push(
        AppState.addEventListener('change', (state: AppStateStatus) => {
          if (state === 'background' || state === 'inactive') {
            wentAway = true;
          } else if (state === 'active' && wentAway) {
            finish(() => resolve(undefined));
          }
        }) as unknown as EmitterSubscription
      );
    }

    timer = setTimeout(
      () => finish(() => reject(new EsewaError(EsewaErrorCode.Timeout, 'The user did not return in time.'))),
      options.timeoutMs
    );

    abortTimer = setInterval(() => {
      if (options.signal?.aborted) {
        finish(() => reject(new EsewaError(EsewaErrorCode.Aborted, 'Waiting for the payment was aborted.')));
      }
    }, 500);
  });

  return { promise, cancel: () => cleanup() };
}

async function payWithIntent(options: EsewaPayOptions): Promise<EsewaPayResult> {
  const deeplink = requireUrl('intent.deeplink', options.intent?.deeplink);
  const native = requireNative();

  if (!(await native.isInstalled())) {
    throw new EsewaError(EsewaErrorCode.NotInstalled, 'The eSewa app is not installed.');
  }

  const wait = waitForReturn({
    watchForeground: true,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    signal: options.signal,
  });

  const opened = await native.openDeeplink(deeplink);
  if (!opened) {
    wait.cancel();
    throw new EsewaError(EsewaErrorCode.OpenFailed, 'The eSewa app could not be opened.');
  }

  const returnUrl = await wait.promise;
  return { flow: 'intent', returnUrl };
}

async function payWithEpay(options: EsewaPayOptions): Promise<EsewaPayResult> {
  const epay = options.epay;
  const url = requireUrl('epay.url', epay?.url);
  const customOpener = epay?.openUrl;

  const wait = waitForReturn({
    prefix: epay?.returnPrefix,
    watchForeground: !customOpener,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    signal: options.signal,
  });

  try {
    if (customOpener) {
      await Promise.race([customOpener(url), wait.promise]);
      wait.cancel();
      return { flow: 'epay' };
    }
    await Linking.openURL(url);
  } catch (error) {
    wait.cancel();
    if (error instanceof EsewaError) throw error;
    throw new EsewaError(EsewaErrorCode.OpenFailed, 'The eSewa payment page could not be opened.');
  }

  const returnUrl = await wait.promise;
  return { flow: 'epay', returnUrl, epay: returnUrl ? parseEpayReturnUrl(returnUrl) : undefined };
}

/**
 * Starts an eSewa payment that your server has already booked / signed, and resolves when the user
 * comes back to the app.
 *
 * - **Intent** (recommended): opens the eSewa app directly with the booking deep link.
 * - **ePay v2**: opens your server's auto-submitting form page; eSewa redirects back through your
 *   `success_url` / `failure_url`.
 *
 * The result only says the user returned. It is **never** proof of payment: confirm with your
 * server, for example with {@link pollPaymentState}.
 */
export async function pay(options: EsewaPayOptions): Promise<EsewaPayResult> {
  const requested = options.flow ?? 'auto';

  if (requested === 'intent') return payWithIntent(options);
  if (requested === 'epay') return payWithEpay(options);

  if (options.intent && (await requireNative().isInstalled())) return payWithIntent(options);
  if (options.epay) return payWithEpay(options);

  throw new EsewaError(
    EsewaErrorCode.NoFlow,
    options.intent
      ? 'The eSewa app is not installed and no ePay fallback was provided.'
      : 'Provide `intent` and/or `epay` options.'
  );
}

