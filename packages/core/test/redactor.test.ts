import { describe, expect, it } from 'vitest';
import {
  createRedactor,
  InvalidConfigurationError,
  type RedactorOptions,
} from '../src/index.js';

const TEST_HMAC_KEY = 'enmascara-test-key-not-for-production-use';
const LINE_WITH_EVERY_TYPE =
  'clabe=002180032240946700 curp=GODE561231HDFRRN00 rfc=GODE561231GR8 card=4242424242424242';

describe('createRedactor', () => {
  it('detects the four identifier types by default', () => {
    expect(createRedactor().text(LINE_WITH_EVERY_TYPE)).toBe(
      'clabe=[CLABE] curp=[CURP] rfc=[RFC] card=[CARD]',
    );
  });

  it('detects only the requested types', () => {
    expect(
      createRedactor({ detect: ['clabe'] }).text(LINE_WITH_EVERY_TYPE),
    ).toBe(
      'clabe=[CLABE] curp=GODE561231HDFRRN00 rfc=GODE561231GR8 card=4242424242424242',
    );
  });

  it('redacts objects and reports findings', () => {
    const redact = createRedactor();

    expect(
      JSON.parse(JSON.stringify(redact.object({ curp: 'GODE561231HDFRRN00' }))),
    ).toEqual({
      curp: '[CURP]',
    });
    expect(redact.findings('a 4242424242424242')).toEqual([
      { type: 'card', start: 2, end: 18, confidence: 'high' },
    ]);
  });

  it('applies the configured limits', () => {
    const redact = createRedactor({ maxInputLength: 6, maxDepth: 1 });

    expect(redact.text('hola mundo')).toBe('hola m[REDACTED]');
    expect(JSON.parse(JSON.stringify(redact.object({ nested: {} })))).toEqual({
      nested: '[MaxDepth]',
    });
  });

  it('returns a frozen redactor', () => {
    expect(Object.isFrozen(createRedactor())).toBe(true);
  });

  it.each([
    [{ detect: ['nss'] }, 'detect lists an unknown identifier type'],
    [{ detect: [] }, 'detect must list at least one identifier type'],
    [{ maxInputLength: 0 }, 'maxInputLength must be a positive integer'],
    [{ maxInputLength: 1.5 }, 'maxInputLength must be a positive integer'],
    [{ maxDepth: -1 }, 'maxDepth must be a positive integer'],
  ])('refuses %j with %j', (options: unknown, message: string) => {
    expect(() => createRedactor(options as RedactorOptions)).toThrow(
      new InvalidConfigurationError(message),
    );
  });

  it('names its configuration error', () => {
    expect(new InvalidConfigurationError('any').name).toBe(
      'InvalidConfigurationError',
    );
  });

  it('applies one strategy to every type', () => {
    expect(
      createRedactor({ strategy: 'partial' }).text('a 002180032240946700'),
    ).toBe('a **************6700');
  });

  it('applies a strategy per type over a default', () => {
    const redact = createRedactor({
      strategy: { default: 'redact', clabe: 'partial', curp: 'hmac' },
      hmacKey: TEST_HMAC_KEY,
    });

    expect(redact.text(LINE_WITH_EVERY_TYPE)).toBe(
      'clabe=**************6700 curp=[CURP:c14e61] rfc=[RFC] card=[CARD]',
    );
  });

  it('accepts the HMAC key as bytes', () => {
    const redact = createRedactor({
      strategy: 'hmac',
      hmacKey: new TextEncoder().encode(TEST_HMAC_KEY),
      detect: ['curp'],
    });

    expect(redact.text('GODE561231HDFRRN00')).toBe('[CURP:c14e61]');
  });

  it('never shows the birth date of a CURP or an RFC with partial', () => {
    const output = createRedactor({ strategy: 'partial' }).text(
      'GODE561231HDFRRN00 GODE561231GR8',
    );

    expect(output).not.toContain('561231');
  });

  it.each([
    [
      { strategy: 'hmac' },
      'hmacKey is required when a type uses the hmac strategy',
    ],
    [
      { strategy: { curp: 'hmac' } },
      'hmacKey is required when a type uses the hmac strategy',
    ],
    [
      { strategy: 'hmac', hmacKey: 'k'.repeat(31) },
      'hmacKey must have at least 32 bytes',
    ],
    [{ strategy: 'shuffle' }, 'strategy names an unknown masking strategy'],
    [
      { strategy: { nss: 'redact' } },
      'strategy lists an unknown identifier type',
    ],
  ])(
    'refuses the strategy options %j with %j',
    (options: unknown, message: string) => {
      expect(() => createRedactor(options as RedactorOptions)).toThrow(
        new InvalidConfigurationError(message),
      );
    },
  );

  it('never repeats the HMAC key in its errors', () => {
    const shortKey = 'secret-key-too-short';

    expect(() =>
      createRedactor({ strategy: 'hmac', hmacKey: shortKey }),
    ).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining(shortKey),
      }),
    );
  });
});
