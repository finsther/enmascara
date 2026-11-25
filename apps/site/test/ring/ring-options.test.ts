import { describe, expect, it } from 'vitest';
import {
  DEMO_HMAC_KEY,
  type RingOptions,
  redactorOptions,
} from '../../src/ring/ring-options.ts';

const MINIMUM_HMAC_KEY_BYTES = 32;

describe('DEMO_HMAC_KEY', () => {
  it('is long enough for the hmac strategy', () => {
    expect(new TextEncoder().encode(DEMO_HMAC_KEY).length).toBeGreaterThan(
      MINIMUM_HMAC_KEY_BYTES,
    );
  });

  it('says that it is a public demo key', () => {
    expect(DEMO_HMAC_KEY).toContain('demo');
    expect(DEMO_HMAC_KEY).toContain('public');
  });
});

describe('redactorOptions', () => {
  it('maps the full mask to the redact strategy', () => {
    const options: RingOptions = { detect: ['clabe'], strategy: 'fullMask' };

    expect(redactorOptions(options)).toEqual({
      detect: ['clabe'],
      strategy: 'redact',
    });
  });

  it('maps the half mask to the partial strategy', () => {
    const options: RingOptions = {
      detect: ['card', 'rfc'],
      strategy: 'halfMask',
    };

    expect(redactorOptions(options)).toEqual({
      detect: ['card', 'rfc'],
      strategy: 'partial',
    });
  });

  it('maps incognito to the hmac strategy with the demo key', () => {
    const options: RingOptions = { detect: ['curp'], strategy: 'incognito' };

    expect(redactorOptions(options)).toEqual({
      detect: ['curp'],
      strategy: 'hmac',
      hmacKey: DEMO_HMAC_KEY,
    });
  });

  it('copies the types instead of sharing the caller array', () => {
    const detect: RingOptions['detect'] = ['clabe', 'card'];

    expect(redactorOptions({ detect, strategy: 'fullMask' }).detect).not.toBe(
      detect,
    );
  });
});
