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

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToBytes(input: string): number[] {
  const clean = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of clean) {
    const value = BASE64_ALPHABET.indexOf(char);
    if (value < 0) throw new Error('invalid base64');
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

function utf8ToString(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    let code = b;
    let extra = 0;
    if (b >= 0xf0) {
      code = b & 0x07;
      extra = 3;
    } else if (b >= 0xe0) {
      code = b & 0x0f;
      extra = 2;
    } else if (b >= 0xc0) {
      code = b & 0x1f;
      extra = 1;
    }
    for (; extra > 0; extra--) code = (code << 6) | (bytes[i++] & 0x3f);
    out += String.fromCodePoint(code);
  }
  return out;
}

function decodeBase64(input: string): string {
  return utf8ToString(base64ToBytes(input));
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
