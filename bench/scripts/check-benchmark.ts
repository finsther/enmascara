import { appendFileSync, readFileSync } from 'node:fs';
import {
  findSlowScenarios,
  renderBenchmarkTable,
  type ScenarioFloors,
} from '../src/report.ts';
import { measureAllScenarios } from './measure-all.ts';

const floors = JSON.parse(
  readFileSync(new URL('../thresholds.json', import.meta.url), 'utf8'),
) as ScenarioFloors;

const results = await measureAllScenarios();
const table = renderBenchmarkTable(results);
const { GITHUB_STEP_SUMMARY: summaryPath } = process.env;
if (summaryPath !== undefined) {
  appendFileSync(summaryPath, `## Benchmark\n\n${table}\n`);
}
console.log(table);

const slowScenarios = findSlowScenarios(results.measurements, floors);
for (const { scenario, megabytesPerSecond, floor } of slowScenarios) {
  console.error(
    `${scenario}: ${megabytesPerSecond.toFixed(1)} MB/s is below the floor of ${floor} MB/s`,
  );
}
process.exitCode = slowScenarios.length === 0 ? 0 : 1;
