import type { InvalidValue } from '../../tools/generator/index.js';
import { type IdentifierType, rejectionFor } from '../../tools/rules/index.js';
import { readYamlDocument } from './spec-files.js';

interface IdentifierDefinition {
  readonly pattern: string;
}

interface BankCatalog {
  readonly banks: readonly { readonly code: string }[];
}

export function readBankCodes(): ReadonlySet<string> {
  const catalog = readYamlDocument('banks.yaml') as BankCatalog;
  return new Set(catalog.banks.map((bank) => bank.code));
}

export function readPattern(type: IdentifierType): string {
  const identifiers = readYamlDocument('identifiers.yaml') as Record<
    string,
    IdentifierDefinition
  >;
  return identifiers[type]?.pattern ?? '';
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
  const bankCodes = readBankCodes();
  const allValues = [...valid, ...invalid.map((fixture) => fixture.value)];
  return [
    ...allValues
      .filter((value) => !matchesWholeValue(pattern, value))
      .map((value) => `${value} does not match the ${type} pattern`),
    ...valid
      .filter((value) => rejectionFor(type, value, bankCodes) !== undefined)
      .map((value) => `${value} is listed as valid but is rejected`),
    ...invalid
      .filter(
        (fixture) =>
          rejectionFor(type, fixture.value, bankCodes) !== fixture.reason,
      )
      .map(
        (fixture) => `${fixture.value} is not rejected for ${fixture.reason}`,
      ),
    ...duplicatesIn(allValues).map((value) => `${value} is repeated`),
  ];
}
