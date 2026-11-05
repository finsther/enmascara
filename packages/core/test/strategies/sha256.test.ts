import { createHash, createHmac } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hmacSha256, sha256 } from '../../src/strategies/sha256.js';

const MILLION = 1_000_000;

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function repeated(byte: number, count: number): Uint8Array {
  return new Uint8Array(count).fill(byte);
}

function hex(digest: Uint8Array): string {
  return Buffer.from(digest).toString('hex');
}

describe('sha256', () => {
  it.each([
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    [
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    ],
  ])('reproduces the FIPS 180-4 example for %j', (message, digest) => {
    expect(hex(sha256(bytes(message)))).toBe(digest);
  });

  it('reproduces the digest of one million letters a', () => {
    expect(hex(sha256(repeated(0x61, MILLION)))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
    );
  });

  it('agrees with node:crypto on arbitrary messages', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ maxLength: 300 }),
        (message) =>
          hex(sha256(message)) ===
          createHash('sha256').update(message).digest('hex'),
      ),
    );
  });
});

describe('hmacSha256', () => {
  it.each([
    [
      1,
      repeated(0x0b, 20),
      bytes('Hi There'),
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    ],
    [
      2,
      bytes('Jefe'),
      bytes('what do ya want for nothing?'),
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    ],
    [
      3,
      repeated(0xaa, 20),
      repeated(0xdd, 50),
      '773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe',
    ],
    [
      4,
      Uint8Array.from({ length: 25 }, (_unused, index) => index + 1),
      repeated(0xcd, 50),
      '82558a389a443c0ea4cc819899f2083a85f0faa3e578f8077a2e3ff46729665b',
    ],
    [
      6,
      repeated(0xaa, 131),
      bytes('Test Using Larger Than Block-Size Key - Hash Key First'),
      '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54',
    ],
    [
      7,
      repeated(0xaa, 131),
      bytes(
        'This is a test using a larger than block-size key and a larger than block-size data. The key needs to be hashed before being used by the HMAC algorithm.',
      ),
      '9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2',
    ],
  ])('reproduces RFC 4231 test case %i', (_testCase, key, message, digest) => {
    expect(hex(hmacSha256(key, message))).toBe(digest);
  });

  it('agrees with node:crypto on arbitrary keys and messages', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ maxLength: 200 }),
        fc.uint8Array({ maxLength: 200 }),
        (key, message) =>
          hex(hmacSha256(key, message)) ===
          createHmac('sha256', key).update(message).digest('hex'),
      ),
    );
  });
});
