import { readFileSync, writeFileSync } from 'node:fs';
import {
  renderBenchmarkTable,
  replaceBenchmarkSection,
} from '../src/report.ts';
import { measureAllScenarios } from './measure-all.ts';

const resultsUrl = new URL('../results.json', import.meta.url);
const readmeUrl = new URL('../../README.md', import.meta.url);

const results = await measureAllScenarios();
writeFileSync(resultsUrl, `${JSON.stringify(results, null, 2)}\n`);
writeFileSync(
  readmeUrl,
  replaceBenchmarkSection(
    readFileSync(readmeUrl, 'utf8'),
    renderBenchmarkTable(results),
  ),
);
console.log(renderBenchmarkTable(results));
