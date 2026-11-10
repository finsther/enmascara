import type { Redactor } from 'enmascara';
import {
  generateLogLines,
  generateLogRecords,
  type LogCorpusOptions,
  type LogLines,
  type LogRecords,
} from './corpus.ts';
import type { ScenarioName } from './report.ts';
import type { SpecIdentifiers } from './spec-identifiers.ts';

export const ONE_MEBIBYTE = 1024 * 1024;

export interface LineScenarioCorpus extends LogLines {
  readonly kind: 'lines';
  readonly name: ScenarioName;
}

export interface RecordScenarioCorpus extends LogRecords {
  readonly kind: 'records';
  readonly name: ScenarioName;
}

export type ScenarioCorpus = LineScenarioCorpus | RecordScenarioCorpus;

export interface PreparedScenario {
  readonly name: ScenarioName;
  readonly bytes: number;
  readonly run: () => void;
}

const CORPUS_SEED = 2026;
const NO_IDENTIFIERS = 0;
const ONE_IN_TWENTY = 1 / 20;
const EVERY_LINE = 1;

export function buildScenarioCorpora(
  identifiers: SpecIdentifiers,
): readonly ScenarioCorpus[] {
  const optionsFor = (identifierShare: number): LogCorpusOptions => ({
    seed: CORPUS_SEED,
    targetBytes: ONE_MEBIBYTE,
    identifierShare,
    identifiers,
  });
  return [
    {
      kind: 'lines',
      name: 'clean-lines',
      ...generateLogLines(optionsFor(NO_IDENTIFIERS)),
    },
    {
      kind: 'lines',
      name: 'mixed-lines',
      ...generateLogLines(optionsFor(ONE_IN_TWENTY)),
    },
    {
      kind: 'lines',
      name: 'dense-lines',
      ...generateLogLines(optionsFor(EVERY_LINE)),
    },
    {
      kind: 'records',
      name: 'records',
      ...generateLogRecords(optionsFor(ONE_IN_TWENTY)),
    },
  ];
}

export function prepareScenario(
  corpus: ScenarioCorpus,
  redactor: Redactor,
): PreparedScenario {
  const run =
    corpus.kind === 'lines'
      ? () => {
          for (const line of corpus.lines) {
            redactor.text(line);
          }
        }
      : () => {
          redactor.object(corpus.records);
        };
  return { name: corpus.name, bytes: corpus.bytes, run };
}
