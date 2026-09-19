import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractEpayData, parseEpayData, parseEpayReturnUrl } from '../src/epay.ts';

const payload = {
  transaction_code: '000AWEO',
  status: 'COMPLETE',
  total_amount: '1,000.0',
  transaction_uuid: '250610-162413',
  product_code: 'EPAYTEST',
  signed_field_names: 'transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names',
  signature: '62GcfZTmVkzhtUeh9QJHHM8TeF8=',
};
const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');

test('parseEpayData decodes the base64 JSON payload', () => {
  assert.deepEqual(parseEpayData(encoded), payload);
});

test('parseEpayData accepts url-safe base64 without padding', () => {
  const urlSafe = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.deepEqual(parseEpayData(urlSafe), payload);
});

test('parseEpayData decodes UTF-8', () => {
  const text = Buffer.from(JSON.stringify({ status: 'रद्द' })).toString('base64');
  assert.equal(parseEpayData(text).status, 'रद्द');
});

test('parseEpayData rejects empty, malformed and non-object data', () => {
  assert.throws(() => parseEpayData(''), { code: 'E_INVALID_RESPONSE' });
  assert.throws(() => parseEpayData('%%%'), { code: 'E_INVALID_RESPONSE' });
  assert.throws(() => parseEpayData(Buffer.from('[1]').toString('base64')), { code: 'E_INVALID_RESPONSE' });
  assert.throws(() => parseEpayData(Buffer.from('"x"').toString('base64')), { code: 'E_INVALID_RESPONSE' });
});

test('extractEpayData reads the data query parameter', () => {
  assert.equal(extractEpayData(`myapp://esewa/success?data=${encodeURIComponent(encoded)}`), encoded);
  assert.equal(extractEpayData('myapp://esewa/failure'), undefined);
  assert.equal(extractEpayData('myapp://esewa/success?other=1'), undefined);
});

test('parseEpayReturnUrl returns the payload, or undefined without data', () => {
  assert.deepEqual(parseEpayReturnUrl(`myapp://esewa/success?data=${encoded}`), payload);
  assert.equal(parseEpayReturnUrl('myapp://esewa/failure'), undefined);
});

test('extractEpayData keeps a raw + from base64 instead of turning it into a space', () => {
  const withPlus = 'ab+cd/ef==';
  assert.equal(extractEpayData(`myapp://esewa/success?data=${withPlus}`), withPlus);
  assert.equal(extractEpayData('myapp://esewa/success?data=ab cd'), 'ab+cd');
});
