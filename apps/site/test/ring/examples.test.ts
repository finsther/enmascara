import { readFileSync } from 'node:fs';
import { createRedactor } from 'enmascara';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { RING_EXAMPLES } from '../../src/ring/examples.ts';

const FIXTURE_TYPES = ['clabe', 'curp', 'rfc', 'card'] as const;
const MINIMUM_FINDINGS_PER_EXAMPLE = 2;
const SEPARATORS = /[\s-]/g;

interface Fixture {
  readonly valid: readonly { readonly value: string }[];
}

function canonical(value: string): string {
  return value.replace(SEPARATORS, '').toUpperCase();
}

function validFixtureValues(): ReadonlySet<string> {
  return new Set(
    FIXTURE_TYPES.flatMap((type) => {
      const url = new URL(
        `../../../../spec/fixtures/${type}.yaml`,
        import.meta.url,
      );
      const fixture: Fixture = parse(readFileSync(url, 'utf8'));
      return fixture.valid.map(({ value }) => canonical(value));
    }),
  );
}

function detectedValues(text: string): readonly string[] {
  return createRedactor()
    .findings(text)
    .map(({ start, end }) => text.slice(start, end));
}

function example(id: string) {
  const found = RING_EXAMPLES.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`missing example ${id}`);
  }
  return found;
}

describe('RING_EXAMPLES', () => {
  it('offers a transfer log, a JSON payload and a CSV export', () => {
    expect(RING_EXAMPLES.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'transfers', label: 'Log de transferencias' },
      { id: 'payload', label: 'Payload JSON' },
      { id: 'export', label: 'Export CSV' },
    ]);
  });

  it('writes the payload as valid JSON', () => {
    expect(() => JSON.parse(example('payload').text)).not.toThrow();
  });

  it('writes the export with the same number of columns on every row', () => {
    const columns = example('export')
      .text.split('\n')
      .map((row) => row.split(',').length);

    expect(new Set(columns).size).toBe(1);
  });

  it.each(RING_EXAMPLES.map(({ id, text }) => ({ id, text })))(
    'uses only valid fixture values in $id',
    ({ text }) => {
      const fixtureValues = validFixtureValues();
      const detected = detectedValues(text);

      expect(detected.length).toBeGreaterThanOrEqual(
        MINIMUM_FINDINGS_PER_EXAMPLE,
      );
      for (const value of detected) {
        expect(fixtureValues).toContain(canonical(value));
      }
    },
  );

  it('shows every identifier type across the examples', () => {
    const types = new Set(
      RING_EXAMPLES.flatMap(({ text }) =>
        createRedactor()
          .findings(text)
          .map(({ type }) => type),
      ),
    );

    expect([...types].sort()).toEqual([...FIXTURE_TYPES].sort());
  });
});
