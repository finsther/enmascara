import type { InvalidValue } from '../../tools/generator/index.ts';
import type { CardNetwork } from '../../tools/rules/card.ts';
import {
  type IdentifierType,
  type ReferenceCatalogs,
  rejectionFor,
} from '../../tools/rules/index.ts';
import { readYamlDocument } from './spec-files.ts';

interface IdentifierDefinition {
  readonly pattern: string;
  readonly allowlist?: readonly string[];
}

export type LookalikeReason = InvalidValue['reason'] | 'pattern' | 'allowlist';

export interface Lookalike {
  readonly text: string;
  readonly reason: LookalikeReason;
}

interface BankCatalog {
  readonly banks: readonly { readonly code: string }[];
}

interface StateCatalog {
  readonly states: readonly { readonly code: string }[];
}

interface CardNetworkCatalog {
  readonly networks: readonly CardNetwork[];
}

export function readBankCodes(): ReadonlySet<string> {
  const catalog = readYamlDocument('banks.yaml') as BankCatalog;
  return new Set(catalog.banks.map((bank) => bank.code));
}

function readStateCodes(): ReadonlySet<string> {
  const catalog = readYamlDocument('states.yaml') as StateCatalog;
  return new Set(catalog.states.map((state) => state.code));
}

function readCardNetworks(): readonly CardNetwork[] {
  const catalog = readYamlDocument('card-networks.yaml') as CardNetworkCatalog;
  return catalog.networks;
}

export function readCatalogs(): ReferenceCatalogs {
  return {
    bankCodes: readBankCodes(),
    stateCodes: readStateCodes(),
    cardNetworks: readCardNetworks(),
  };
}

function readDefinition(type: IdentifierType): IdentifierDefinition {
  const identifiers = readYamlDocument('identifiers.yaml') as Record<
    string,
    IdentifierDefinition
  >;
  return identifiers[type] ?? { pattern: '' };
}

export function readPattern(type: IdentifierType): string {
  return readDefinition(type).pattern;
}

function matchesWholeValue(pattern: string, value: string): boolean {
  return new RegExp(`^(?:${pattern})$`, 'u').test(value);
}

function duplicatesIn(values: readonly string[]): readonly string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

export function valueProblems(
  type: IdentifierType,
  valid: readonly string[],
  invalid: readonly InvalidValue[],
): readonly string[] {
  const pattern = readPattern(type);
  const catalogs = readCatalogs();
  const allValues = [...valid, ...invalid.map((fixture) => fixture.value)];
  return [
    ...allValues
      .filter((value) => !matchesWholeValue(pattern, value))
      .map((value) => `${value} does not match the ${type} pattern`),
    ...valid
      .filter((value) => rejectionFor(type, value, catalogs) !== undefined)
      .map((value) => `${value} is listed as valid but is rejected`),
    ...invalid
      .filter(
        (fixture) =>
          rejectionFor(type, fixture.value, catalogs) !== fixture.reason,
      )
      .map(
        (fixture) => `${fixture.value} is not rejected for ${fixture.reason}`,
      ),
    ...duplicatesIn(allValues).map((value) => `${value} is repeated`),
  ];
}

function matchesIn(pattern: string, text: string): readonly string[] {
  return [...text.matchAll(new RegExp(pattern, 'gu'))].map((match) => match[0]);
}

function isExplainedBy(
  type: IdentifierType,
  lookalike: Lookalike,
  candidates: readonly string[],
): boolean {
  if (lookalike.reason === 'pattern') {
    return candidates.length === 0;
  }
  const allowlist = readDefinition(type).allowlist ?? [];
  const catalogs = readCatalogs();
  const isExplained = (candidate: string): boolean =>
    lookalike.reason === 'allowlist'
      ? allowlist.includes(candidate)
      : rejectionFor(type, candidate, catalogs) === lookalike.reason;
  return candidates.length > 0 && candidates.every(isExplained);
}

export function lookalikeProblems(
  type: IdentifierType,
  lookalikes: readonly Lookalike[],
): readonly string[] {
  const pattern = readPattern(type);
  return lookalikes
    .filter(
      (lookalike) =>
        !isExplainedBy(type, lookalike, matchesIn(pattern, lookalike.text)),
    )
    .map(
      (lookalike) =>
        `"${lookalike.text}" is not explained by ${lookalike.reason}`,
    );
}
