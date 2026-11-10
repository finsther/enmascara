import { createRedactor } from 'enmascara';
import { describe, expect, it } from 'vitest';
import {
  generateLogLines,
  generateLogRecords,
  type LogCorpusOptions,
} from '../src/corpus.ts';
import { readSpecIdentifiers } from '../src/spec-identifiers.ts';

const TARGET_BYTES = 64 * 1024;
const ONE_IN_TWENTY = 1 / 20;
const MASK_LABEL = /\[(?:CLABE|CURP|RFC|CARD)\]/g;

function optionsWith(
  overrides: Partial<LogCorpusOptions> = {},
): LogCorpusOptions {
  return {
    seed: 7,
    targetBytes: TARGET_BYTES,
    identifierShare: ONE_IN_TWENTY,
    identifiers: readSpecIdentifiers(),
    ...overrides,
  };
}

function countFindings(lines: readonly string[]): number {
  const redact = createRedactor();
  return lines.reduce((total, line) => total + redact.findings(line).length, 0);
}

describe('spec identifiers', () => {
  it('reads valid and check-digit lookalike values for the four types', () => {
    const identifiers = readSpecIdentifiers();

    expect(new Set(identifiers.valid.map(({ type }) => type))).toEqual(
      new Set(['clabe', 'curp', 'rfc', 'card']),
    );
    expect(identifiers.lookalikes.length).toBeGreaterThan(0);
  });
});

describe('generateLogLines', () => {
  it('produces the same lines for the same seed', () => {
    expect(generateLogLines(optionsWith())).toEqual(
      generateLogLines(optionsWith()),
    );
  });

  it('produces different lines for different seeds', () => {
    expect(generateLogLines(optionsWith({ seed: 8 })).lines).not.toEqual(
      generateLogLines(optionsWith()).lines,
    );
  });

  it('stops at the first line that reaches the target size', () => {
    const corpus = generateLogLines(optionsWith());
    const lastLineBytes = Buffer.byteLength(corpus.lines.at(-1) ?? '');

    expect(corpus.bytes).toBeGreaterThanOrEqual(TARGET_BYTES);
    expect(corpus.bytes - lastLineBytes).toBeLessThan(TARGET_BYTES);
    expect(corpus.bytes).toBe(
      corpus.lines.reduce((total, line) => total + Buffer.byteLength(line), 0),
    );
  });

  it('plants no identifier and triggers no detection with a share of 0', () => {
    const corpus = generateLogLines(optionsWith({ identifierShare: 0 }));

    expect(corpus.plantedIdentifiers).toBe(0);
    expect(countFindings(corpus.lines)).toBe(0);
  });

  it('plants one identifier every twenty lines', () => {
    const corpus = generateLogLines(optionsWith());

    expect(corpus.plantedIdentifiers).toBe(
      Math.floor(corpus.lines.length * ONE_IN_TWENTY),
    );
    expect(countFindings(corpus.lines)).toBe(corpus.plantedIdentifiers);
  });

  it('plants one identifier in every line with a share of 1', () => {
    const corpus = generateLogLines(optionsWith({ identifierShare: 1 }));

    expect(corpus.plantedIdentifiers).toBe(corpus.lines.length);
    expect(countFindings(corpus.lines)).toBe(corpus.plantedIdentifiers);
  });

  it('rotates through the four identifier types', () => {
    const redact = createRedactor();
    const corpus = generateLogLines(optionsWith({ identifierShare: 1 }));
    const types = corpus.lines.flatMap((line) =>
      redact.findings(line).map(({ type }) => type),
    );

    expect(new Set(types)).toEqual(new Set(['clabe', 'curp', 'rfc', 'card']));
  });

  it.each([-0.1, 1.1, Number.NaN])(
    'rejects an identifier share of %s',
    (identifierShare) => {
      expect(() => generateLogLines(optionsWith({ identifierShare }))).toThrow(
        RangeError,
      );
    },
  );
});

describe('generateLogRecords', () => {
  it('measures the records as their JSON size', () => {
    const corpus = generateLogRecords(optionsWith());

    expect(corpus.bytes).toBe(
      Buffer.byteLength(JSON.stringify(corpus.records)),
    );
    expect(corpus.bytes).toBeGreaterThanOrEqual(TARGET_BYTES);
  });

  it('masks exactly the planted identifiers', () => {
    const corpus = generateLogRecords(optionsWith());
    const masked = JSON.stringify(createRedactor().object(corpus.records));

    expect(corpus.plantedIdentifiers).toBeGreaterThan(0);
    expect(masked.match(MASK_LABEL)?.length).toBe(corpus.plantedIdentifiers);
  });
});
