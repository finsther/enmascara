import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readYamlDocument } from './support/spec-files.ts';

interface CredentialHeaderCatalog {
  readonly headers: readonly { readonly name: string }[];
}

const EXPRESS_CATALOGS_DIRECTORY = new URL(
  '../../packages/express/src/catalogs/',
  import.meta.url,
);

function readExpressCatalog(fileName: string): unknown {
  return JSON.parse(
    readFileSync(new URL(fileName, EXPRESS_CATALOGS_DIRECTORY), 'utf8'),
  );
}

describe('Express catalogs', () => {
  it('lists exactly the header names of spec/credential-headers.yaml, sorted', () => {
    const catalog = readYamlDocument(
      'credential-headers.yaml',
    ) as CredentialHeaderCatalog;

    expect(readExpressCatalog('credential-headers.json')).toEqual(
      catalog.headers.map((header) => header.name).sort(),
    );
  });
});
