import { describe, expect, it } from 'vitest';
import {
  createRedactor,
  InvalidConfigurationError,
  type RedactorOptions,
} from '../src/index.js';

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
});
