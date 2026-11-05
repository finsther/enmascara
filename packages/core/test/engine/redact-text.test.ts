import { describe, expect, it } from 'vitest';
import { createEngine, type EngineOptions } from '../../src/engine/engine.js';
import { findingsInText, redactText } from '../../src/engine/redact-text.js';
import { InvalidConfigurationError } from '../../src/errors.js';
import { redactStrategy } from '../../src/strategies/redact-strategy.js';
import type { ValidatorRegistry } from '../../src/validators/validator-registry.js';

const ALL_TYPES = ['clabe', 'curp', 'rfc', 'card'];
const MAX_INPUT_LENGTH = 1_000_000;

function options(overrides: Partial<EngineOptions> = {}): EngineOptions {
  return {
    types: ALL_TYPES,
    maxInputLength: MAX_INPUT_LENGTH,
    maxDepth: 32,
    strategyFor: () => redactStrategy,
    ...overrides,
  };
}

const THROWING_REGISTRY: ValidatorRegistry = {
  names: () => ['throwing'],
  validatorFor: () => ({
    isValid: () => {
      throw new Error('validator failure');
    },
  }),
};

const WORD_DEFINITIONS = {
  word: { pattern: '[A-Z]{4}', validator: 'throwing', confidence: 'high' },
};

describe('redactText', () => {
  const engine = createEngine(options());

  it('masks an identifier and leaves the rest of the text', () => {
    expect(redactText('SPEI a 002180032240946700 confirmado', engine)).toBe(
      'SPEI a [CLABE] confirmado',
    );
  });

  it('masks the original span, invisible characters included', () => {
    expect(redactText('curp=GODE561231​HDFRRN00;', engine)).toBe('curp=[CURP];');
  });

  it('counts full-width digits before taking the short text path', () => {
    expect(redactText('００２１８００３２２４０９４６７００', engine)).toBe(
      '[CLABE]',
    );
  });

  it('returns text with fewer than six digits without detecting', () => {
    const failingClosed = createEngine(
      options({ types: ['word'] }),
      WORD_DEFINITIONS,
      THROWING_REGISTRY,
    );

    expect(redactText('HOLA 12345', failingClosed)).toBe('HOLA 12345');
    expect(redactText('HOLA 123456', failingClosed)).toBe('[WORD] 123456');
  });

  it('replaces whatever exceeds the maximum length', () => {
    const limited = createEngine(options({ maxInputLength: 26 }));

    expect(
      redactText('SPEI a 002180032240946700 y 4242424242424242', limited),
    ).toBe('SPEI a [CLABE] [REDACTED]');
  });

  it('leaves to the excess an identifier that starts right at the limit', () => {
    const limited = createEngine(options({ maxInputLength: 7 }));

    expect(redactText('SPEI a 002180032240946700', limited)).toBe(
      'SPEI a [REDACTED]',
    );
  });

  it('adds no excess mask when the last finding reaches the end of the text', () => {
    const limited = createEngine(options({ maxInputLength: 40 }));

    expect(
      redactText(
        '4242424242424242 4242424242424242 002180032240946700',
        limited,
      ),
    ).toBe('[CARD] [CARD] [CLABE]');
  });

  it('leaks no part of an identifier cut by the maximum length', () => {
    const limited = createEngine(options({ maxInputLength: 15 }));

    expect(redactText('SPEI a 002180032240946700 fin', limited)).toBe(
      'SPEI a [CLABE][REDACTED]',
    );
  });
});

describe('findingsInText', () => {
  const engine = createEngine(options());

  it('reports findings at their original positions', () => {
    expect(findingsInText('a 4242424242424242', engine)).toEqual([
      { type: 'card', start: 2, end: 18, confidence: 'high' },
    ]);
  });

  it('reports nothing for text with fewer than six digits', () => {
    expect(findingsInText('hola 12345', engine)).toEqual([]);
  });
});

describe('createEngine', () => {
  it('refuses an identifier type outside the spec', () => {
    expect(() => createEngine(options({ types: ['nss'] }))).toThrow(
      InvalidConfigurationError,
    );
  });

  it('refuses a confidence outside high, medium and low', () => {
    const definitions = {
      word: { pattern: '[A-Z]{4}', validator: 'throwing', confidence: 'sure' },
    };

    expect(() =>
      createEngine(
        options({ types: ['word'] }),
        definitions,
        THROWING_REGISTRY,
      ),
    ).toThrow(InvalidConfigurationError);
  });
});
