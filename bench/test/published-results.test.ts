import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  type BenchmarkResults,
  renderBenchmarkTable,
  replaceBenchmarkSection,
  SCENARIO_NAMES,
  type ScenarioFloors,
} from '../src/report.ts';

const resultsUrl = new URL('../results.json', import.meta.url);
const thresholdsUrl = new URL('../thresholds.json', import.meta.url);
const readmeUrl = new URL('../../README.md', import.meta.url);

function readJson<Value>(url: URL): Value {
  return JSON.parse(readFileSync(url, 'utf8')) as Value;
}

describe('published benchmark results', () => {
  it('exist for every scenario', () => {
    expect(existsSync(resultsUrl)).toBe(true);
    const results = readJson<BenchmarkResults>(resultsUrl);

    expect(results.measurements.map(({ scenario }) => scenario)).toEqual([
      ...SCENARIO_NAMES,
    ]);
  });

  it('match the README table', () => {
    const readme = readFileSync(readmeUrl, 'utf8');
    const table = renderBenchmarkTable(readJson<BenchmarkResults>(resultsUrl));

    expect(replaceBenchmarkSection(readme, table)).toBe(readme);
  });

  it('set a positive floor for every scenario', () => {
    const floors = readJson<ScenarioFloors>(thresholdsUrl);

    expect(Object.keys(floors).sort()).toEqual([...SCENARIO_NAMES].sort());
    for (const floor of Object.values(floors)) {
      expect(floor).toBeGreaterThan(0);
    }
  });
});
