import {
  createRandom,
  type Random,
} from '../../spec/tools/generator/random.ts';
import {
  IDENTIFIER_TYPES,
  type IdentifierType,
  type SpecIdentifiers,
} from './spec-identifiers.ts';

export interface LogCorpusOptions {
  readonly seed: number;
  readonly targetBytes: number;
  readonly identifierShare: number;
  readonly identifiers: SpecIdentifiers;
}

export type LogRecord = Readonly<Record<string, string | number>>;

export interface LogLines {
  readonly lines: readonly string[];
  readonly bytes: number;
  readonly plantedIdentifiers: number;
}

export interface LogRecords {
  readonly records: readonly LogRecord[];
  readonly bytes: number;
  readonly plantedIdentifiers: number;
}

interface GeneratedRecord {
  readonly record: LogRecord;
  readonly planted: boolean;
}

const FIRST_TIMESTAMP = Date.UTC(2026, 10, 2);
const MILLISECONDS_BETWEEN_RECORDS = 1000;
const LEVELS = ['info', 'info', 'info', 'warn', 'error'] as const;
const METHODS = ['GET', 'POST', 'PUT'] as const;
const PATHS = [
  '/v1/transfers',
  '/v1/accounts',
  '/v1/payments',
  '/v1/customers',
  '/health',
] as const;
const STATUSES = [200, 201, 204, 400, 404, 500] as const;
const HEXADECIMAL_DIGITS = '0123456789abcdef';
const REQUEST_ID_LENGTH = 32;
const MAXIMUM_LATENCY_MILLISECONDS = 2000;
const MAXIMUM_AMOUNT_CENTS = 5_000_000;
const CENTS_PER_PESO = 100;
const PHONE_PREFIX = '55';
const PHONE_SUFFIX_DIGITS = 8;
const LOOKALIKE_SHARE = 1 / 10;
const JSON_ARRAY_BRACKETS_BYTES = 2;
const JSON_SEPARATOR_BYTES = 1;

function assertShare(identifierShare: number): void {
  if (!(identifierShare >= 0 && identifierShare <= 1)) {
    throw new RangeError('identifierShare must be between 0 and 1');
  }
}

function isSelected(index: number, share: number): boolean {
  return Math.floor((index + 1) * share) > Math.floor(index * share);
}

function groupValuesByType(
  identifiers: SpecIdentifiers,
): ReadonlyMap<IdentifierType, readonly string[]> {
  return new Map(
    IDENTIFIER_TYPES.map((type) => [
      type,
      identifiers.valid
        .filter((identifier) => identifier.type === type)
        .map(({ value }) => value),
    ]),
  );
}

function formatAmount(cents: number): string {
  return (cents / CENTS_PER_PESO).toFixed(2);
}

function createRecordSource(
  options: LogCorpusOptions,
): (index: number) => GeneratedRecord {
  assertShare(options.identifierShare);
  const random: Random = createRandom(options.seed);
  const valuesByType = groupValuesByType(options.identifiers);
  let plantedSoFar = 0;

  const plantIdentifier = (): LogRecord => {
    const type = IDENTIFIER_TYPES[plantedSoFar % IDENTIFIER_TYPES.length];
    plantedSoFar += 1;
    if (type === undefined) {
      return {};
    }
    return { [type]: random.pick(valuesByType.get(type) ?? []) };
  };

  return (index) => {
    const planted = isSelected(index, options.identifierShare);
    const lookalike = isSelected(index, LOOKALIKE_SHARE)
      ? { reference: random.pick(options.identifiers.lookalikes) }
      : {};
    const record: LogRecord = {
      timestamp: new Date(
        FIRST_TIMESTAMP +
          index * MILLISECONDS_BETWEEN_RECORDS +
          random.integer(0, MILLISECONDS_BETWEEN_RECORDS - 1),
      ).toISOString(),
      level: random.pick(LEVELS),
      method: random.pick(METHODS),
      path: random.pick(PATHS),
      status: random.pick(STATUSES),
      latency: random.integer(1, MAXIMUM_LATENCY_MILLISECONDS),
      request: random.characters(HEXADECIMAL_DIGITS, REQUEST_ID_LENGTH),
      amount: formatAmount(random.integer(1, MAXIMUM_AMOUNT_CENTS)),
      phone: `${PHONE_PREFIX}${random.characters('0123456789', PHONE_SUFFIX_DIGITS)}`,
      ...lookalike,
      ...(planted ? plantIdentifier() : {}),
    };
    return { record, planted };
  };
}

function formatLine(record: LogRecord): string {
  const { timestamp, level, method, path, ...fields } = record;
  const pairs = Object.entries(fields).map(
    ([field, value]) => `${field}=${value}`,
  );
  return [timestamp, String(level).toUpperCase(), method, path, ...pairs].join(
    ' ',
  );
}

export function generateLogLines(options: LogCorpusOptions): LogLines {
  const nextRecord = createRecordSource(options);
  const lines: string[] = [];
  let bytes = 0;
  let plantedIdentifiers = 0;
  while (bytes < options.targetBytes) {
    const { record, planted } = nextRecord(lines.length);
    const line = formatLine(record);
    lines.push(line);
    bytes += Buffer.byteLength(line);
    plantedIdentifiers += Number(planted);
  }
  return { lines, bytes, plantedIdentifiers };
}

export function generateLogRecords(options: LogCorpusOptions): LogRecords {
  const nextRecord = createRecordSource(options);
  const records: LogRecord[] = [];
  let bytes = JSON_ARRAY_BRACKETS_BYTES;
  let plantedIdentifiers = 0;
  while (bytes < options.targetBytes) {
    const { record, planted } = nextRecord(records.length);
    const separatorBytes = records.length === 0 ? 0 : JSON_SEPARATOR_BYTES;
    records.push(record);
    bytes += separatorBytes + Buffer.byteLength(JSON.stringify(record));
    plantedIdentifiers += Number(planted);
  }
  return { records, bytes, plantedIdentifiers };
}
