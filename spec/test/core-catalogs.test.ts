import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readBankCodes } from './support/fixture-problems.ts';

const CORE_CATALOGS_DIRECTORY = new URL(
  '../../packages/core/src/catalogs/',
  import.meta.url,
);

function readCoreCatalog(fileName: string): unknown {
  return JSON.parse(
    readFileSync(new URL(fileName, CORE_CATALOGS_DIRECTORY), 'utf8'),
  );
}

describe('core catalogs', () => {
  it('lists exactly the bank codes of spec/banks.yaml, sorted', () => {
    expect(readCoreCatalog('bank-codes.json')).toEqual(
      [...readBankCodes()].sort(),
    );
  });
});
