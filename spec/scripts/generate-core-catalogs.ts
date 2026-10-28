import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';

interface BankCatalog {
  readonly banks: readonly { readonly code: string }[];
}

const SPEC_DIRECTORY = new URL('../', import.meta.url);
const CORE_CATALOGS_DIRECTORY = new URL(
  '../packages/core/src/catalogs/',
  SPEC_DIRECTORY,
);
const JSON_INDENTATION = 2;

function readSpecYaml(fileName: string): unknown {
  return parse(readFileSync(new URL(fileName, SPEC_DIRECTORY), 'utf8'));
}

function writeCoreCatalog(fileName: string, content: unknown): void {
  writeFileSync(
    new URL(fileName, CORE_CATALOGS_DIRECTORY),
    `${JSON.stringify(content, null, JSON_INDENTATION)}\n`,
  );
}

const banks = readSpecYaml('banks.yaml') as BankCatalog;
writeCoreCatalog(
  'bank-codes.json',
  banks.banks.map((bank) => bank.code).sort(),
);
