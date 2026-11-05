import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { Finding } from '../../src/engine/detect.js';
import { createHmacStrategy } from '../../src/strategies/hmac-strategy.js';
import type { MaskingStrategy } from '../../src/strategies/masking-strategy.js';
import { createPartialStrategy } from '../../src/strategies/partial-strategy.js';
import { redactStrategy } from '../../src/strategies/redact-strategy.js';

interface StrategyCase {
  readonly type: string;
  readonly value: string;
  readonly strategy: 'redact' | 'partial' | 'hmac';
  readonly output: string;
}

const fixtures = parse(
  readFileSync(
    new URL('../../../../spec/fixtures/strategies.yaml', import.meta.url),
    'utf8',
  ),
) as { readonly key: string; readonly cases: readonly StrategyCase[] };

const VISIBLE_CHARACTERS: ReadonlyMap<string, number> = new Map([
  ['clabe', 4],
  ['curp', 2],
  ['rfc', 2],
  ['card', 4],
]);

const STRATEGIES: Readonly<Record<StrategyCase['strategy'], MaskingStrategy>> =
  {
    redact: redactStrategy,
    partial: createPartialStrategy(VISIBLE_CHARACTERS),
    hmac: createHmacStrategy(new TextEncoder().encode(fixtures.key)),
  };

function finding(type: string): Finding {
  return { type, start: 0, end: 0, confidence: 'high' };
}

describe('spec strategy fixtures', () => {
  it.each(
    fixtures.cases.map((fixture) => [
      fixture.strategy,
      fixture.type,
      fixture.value,
      fixture,
    ]),
  )('masks with %s the %s %j', (_strategy, _type, _value, fixture) => {
    expect(
      STRATEGIES[fixture.strategy].mask(finding(fixture.type), fixture.value),
    ).toBe(fixture.output);
  });
});

describe('createPartialStrategy', () => {
  it('shows nothing of a type it has no rule for', () => {
    const partial = createPartialStrategy(new Map());

    expect(partial.mask(finding('curp'), 'GODE561231HDFRRN00')).toBe(
      '******************',
    );
  });
});

describe('createHmacStrategy', () => {
  it('gives different tags under different keys', () => {
    const encoder = new TextEncoder();
    const first = createHmacStrategy(encoder.encode('a'.repeat(32)));
    const second = createHmacStrategy(encoder.encode('b'.repeat(32)));

    expect(first.mask(finding('curp'), 'GODE561231HDFRRN00')).not.toBe(
      second.mask(finding('curp'), 'GODE561231HDFRRN00'),
    );
  });
});
