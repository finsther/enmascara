import { createRedactor, type Redactor } from 'enmascara';
import { describe, expect, it } from 'vitest';
import { SCENARIO_NAMES } from '../src/report.ts';
import {
  buildScenarioCorpora,
  ONE_MEBIBYTE,
  prepareScenario,
  type ScenarioCorpus,
} from '../src/scenarios.ts';
import { readSpecIdentifiers } from '../src/spec-identifiers.ts';

const MASK_LABEL = /\[(?:CLABE|CURP|RFC|CARD)\]/g;
const corpora = buildScenarioCorpora(readSpecIdentifiers());

function corpusNamed(name: string): ScenarioCorpus {
  const corpus = corpora.find((candidate) => candidate.name === name);
  if (corpus === undefined) {
    throw new Error(`Missing scenario ${name}`);
  }
  return corpus;
}

function countMaskedIdentifiers(corpus: ScenarioCorpus): number {
  const redact = createRedactor();
  const masked =
    corpus.kind === 'lines'
      ? corpus.lines.map((line) => redact.text(line)).join('\n')
      : JSON.stringify(redact.object(corpus.records));
  return masked.match(MASK_LABEL)?.length ?? 0;
}

function createCountingRedactor(): {
  readonly redactor: Redactor;
  readonly calls: { text: number; object: number };
} {
  const calls = { text: 0, object: 0 };
  const redactor: Redactor = {
    text: (input) => {
      calls.text += 1;
      return input;
    },
    object: (input) => {
      calls.object += 1;
      return input;
    },
    findings: () => [],
  };
  return { redactor, calls };
}

describe('benchmark scenarios', () => {
  it('builds one corpus per scenario, in report order', () => {
    expect(corpora.map(({ name }) => name)).toEqual([...SCENARIO_NAMES]);
  });

  it.each(SCENARIO_NAMES)('gives %s at least one mebibyte', (name) => {
    expect(corpusNamed(name).bytes).toBeGreaterThanOrEqual(ONE_MEBIBYTE);
  });

  it('plants the documented share of identifiers', () => {
    const lineCount = (name: string): number => {
      const corpus = corpusNamed(name);
      return corpus.kind === 'lines' ? corpus.lines.length : 0;
    };

    expect(corpusNamed('clean-lines').plantedIdentifiers).toBe(0);
    expect(corpusNamed('mixed-lines').plantedIdentifiers).toBe(
      Math.floor(lineCount('mixed-lines') / 20),
    );
    expect(corpusNamed('dense-lines').plantedIdentifiers).toBe(
      lineCount('dense-lines'),
    );
    expect(corpusNamed('records').plantedIdentifiers).toBeGreaterThan(0);
  });

  it.each(SCENARIO_NAMES)(
    'masks exactly the planted identifiers in %s',
    (name) => {
      const corpus = corpusNamed(name);

      expect(countMaskedIdentifiers(corpus)).toBe(corpus.plantedIdentifiers);
    },
  );
});

describe('prepareScenario', () => {
  it('redacts every line of a line scenario as its own text', () => {
    const { redactor, calls } = createCountingRedactor();
    const corpus = corpusNamed('mixed-lines');
    const scenario = prepareScenario(corpus, redactor);

    scenario.run();

    expect(scenario).toMatchObject({
      name: 'mixed-lines',
      bytes: corpus.bytes,
    });
    expect(calls).toEqual({
      text: corpus.kind === 'lines' ? corpus.lines.length : -1,
      object: 0,
    });
  });

  it('redacts the records scenario as one object', () => {
    const { redactor, calls } = createCountingRedactor();
    const scenario = prepareScenario(corpusNamed('records'), redactor);

    scenario.run();

    expect(calls).toEqual({ text: 0, object: 1 });
  });
});
