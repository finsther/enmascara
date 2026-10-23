import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import {
  formatCurpReport,
  reportCurpCheck,
} from '../tools/verification/curp-report.ts';

const STANDARD_INPUT = 0;

interface CurpDefinition {
  readonly curp: { readonly pattern: string };
}

interface StateCatalog {
  readonly states: readonly { readonly code: string }[];
}

function readSpecYaml(fileName: string): unknown {
  return parse(
    readFileSync(new URL(`../${fileName}`, import.meta.url), 'utf8'),
  );
}

const identifiers = readSpecYaml('identifiers.yaml') as CurpDefinition;
const catalog = readSpecYaml('states.yaml') as StateCatalog;

const report = reportCurpCheck(
  readFileSync(STANDARD_INPUT, 'utf8').split('\n'),
  {
    pattern: identifiers.curp.pattern,
    stateCodes: new Set(catalog.states.map((state) => state.code)),
  },
);

process.stdout.write(`${formatCurpReport(report)}\n`);
process.exitCode = report.results.some(
  (result) => result.outcome === 'check_digit',
)
  ? 1
  : 0;
