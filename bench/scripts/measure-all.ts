import { cpus } from 'node:os';
import { createRedactor } from 'enmascara';
import { measureScenarios } from '../src/measure.ts';
import type { BenchmarkResults } from '../src/report.ts';
import { buildScenarioCorpora, prepareScenario } from '../src/scenarios.ts';
import { readSpecIdentifiers } from '../src/spec-identifiers.ts';

const MEASURE_OPTIONS = { time: 2000, warmupTime: 500 } as const;
const ISO_DATE_LENGTH = 10;

export async function measureAllScenarios(): Promise<BenchmarkResults> {
  const redactor = createRedactor();
  const scenarios = buildScenarioCorpora(readSpecIdentifiers()).map((corpus) =>
    prepareScenario(corpus, redactor),
  );
  return {
    measuredOn: new Date().toISOString().slice(0, ISO_DATE_LENGTH),
    node: process.version,
    cpu: cpus()[0]?.model.trim() ?? 'unknown CPU',
    measurements: await measureScenarios(scenarios, MEASURE_OPTIONS),
  };
}
