import { EsewaError, EsewaErrorCode } from './errors';

/**
 * The payload eSewa appends (base64 encoded JSON) to the ePay v2 `success_url`.
 * Field names follow eSewa's documentation.
 */
export interface EpayResponse {
  transaction_code?: string;
  status?: string;
  total_amount?: string | number;
  transaction_uuid?: string;
  product_code?: string;
  signed_field_names?: string;
  signature?: string;
}

const BASE64_URL_SAFE = /[-_]/g;

function decodeBase64(input: string): string {
  const normalized = input.replace(BASE64_URL_SAFE, (char) => (char === '-' ? '+' : '/'));
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

  if (typeof atob === 'function') {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  throw new EsewaError(EsewaErrorCode.InvalidResponse, 'No base64 decoder is available in this runtime.');
}

/**
 * Decodes the base64 `data` value from an ePay v2 return. The result is **unverified**: anyone can
 * craft a URL, so your server must check the signature and look the transaction up before trusting it.
 */
export function parseEpayData(data: string): EpayResponse {
  if (!data || typeof data !== 'string') {
    throw new EsewaError(EsewaErrorCode.InvalidResponse, 'The ePay response is empty.');
  }
  try {
    const parsed = JSON.parse(decodeBase64(data.trim())) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    return parsed as EpayResponse;
  } catch (error) {
    if (error instanceof EsewaError) throw error;
    throw new EsewaError(EsewaErrorCode.InvalidResponse, 'The ePay response is not valid base64 JSON.');
  }
}

/** Reads the `data` query parameter from a return URL without needing the URL class. */
export function extractEpayData(url: string): string | undefined {
  const query = url.split('#')[0].split('?')[1];
  if (!query) return undefined;

  for (const pair of query.split('&')) {
    const [key, ...rest] = pair.split('=');
    if (key === 'data') {
      return decodeURIComponent(rest.join('=').replace(/\+/g, ' '));
    }
  }
  return undefined;
}

/**
 * Parses a return URL. Returns the decoded ePay payload when the URL carries a `data` parameter,
 * otherwise `undefined` (for example a plain failure redirect).
 */
export function parseEpayReturnUrl(url: string): EpayResponse | undefined {
  const data = extractEpayData(url);
  return data ? parseEpayData(data) : undefined;
}
