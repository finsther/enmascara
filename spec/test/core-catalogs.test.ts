import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readBankCodes, readCatalogs } from './support/fixture-problems.ts';
import { readYamlDocument } from './support/spec-files.ts';

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

  it('lists exactly the state codes of spec/states.yaml, sorted', () => {
    expect(readCoreCatalog('state-codes.json')).toEqual(
      [...readCatalogs().stateCodes].sort(),
    );
  });

  it('copies spec/identifiers.yaml as it is', () => {
    expect(readCoreCatalog('identifiers.json')).toEqual(
      readYamlDocument('identifiers.yaml'),
    );
  });

  it('lists the card networks of spec/card-networks.yaml without their sources', () => {
    const networks = readCatalogs().cardNetworks.map((network) => ({
      name: network.name,
      lengths: network.lengths,
      prefixes: network.prefixes,
    }));

    expect(readCoreCatalog('card-networks.json')).toEqual(networks);
  });
});
