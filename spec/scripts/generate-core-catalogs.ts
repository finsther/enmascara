import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';

interface BankCatalog {
  readonly banks: readonly { readonly code: string }[];
}

interface StateCatalog {
  readonly states: readonly { readonly code: string }[];
}

interface CredentialHeaderCatalog {
  readonly headers: readonly { readonly name: string }[];
}

interface CardNetworkCatalog {
  readonly networks: readonly {
    readonly name: string;
    readonly lengths: readonly number[];
    readonly prefixes: readonly {
      readonly from: string;
      readonly to: string;
    }[];
  }[];
}

const SPEC_DIRECTORY = new URL('../', import.meta.url);
const CORE_CATALOGS_DIRECTORY = new URL(
  '../packages/core/src/catalogs/',
  SPEC_DIRECTORY,
);
const EXPRESS_CATALOGS_DIRECTORY = new URL(
  '../packages/express/src/catalogs/',
  SPEC_DIRECTORY,
);
const JSON_INDENTATION = 2;

function readSpecYaml(fileName: string): unknown {
  return parse(readFileSync(new URL(fileName, SPEC_DIRECTORY), 'utf8'));
}

function writeCatalog(
  directory: URL,
  fileName: string,
  content: unknown,
): void {
  writeFileSync(
    new URL(fileName, directory),
    `${JSON.stringify(content, null, JSON_INDENTATION)}\n`,
  );
}

function writeCoreCatalog(fileName: string, content: unknown): void {
  writeCatalog(CORE_CATALOGS_DIRECTORY, fileName, content);
}

const banks = readSpecYaml('banks.yaml') as BankCatalog;
writeCoreCatalog(
  'bank-codes.json',
  banks.banks.map((bank) => bank.code).sort(),
);

const cardNetworks = readSpecYaml('card-networks.yaml') as CardNetworkCatalog;
writeCoreCatalog(
  'card-networks.json',
  cardNetworks.networks.map((network) => ({
    name: network.name,
    lengths: network.lengths,
    prefixes: network.prefixes,
  })),
);

const states = readSpecYaml('states.yaml') as StateCatalog;
writeCoreCatalog(
  'state-codes.json',
  states.states.map((state) => state.code).sort(),
);

writeCoreCatalog('identifiers.json', readSpecYaml('identifiers.yaml'));

const credentialHeaders = readSpecYaml(
  'credential-headers.yaml',
) as CredentialHeaderCatalog;
writeCatalog(
  EXPRESS_CATALOGS_DIRECTORY,
  'credential-headers.json',
  credentialHeaders.headers.map((header) => header.name).sort(),
);
