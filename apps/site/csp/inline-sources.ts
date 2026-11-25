import { createHash } from 'node:crypto';

export type SourceHash = `sha256-${string}`;

export interface InlineSourceHashes {
  readonly scripts: readonly SourceHash[];
  readonly styleAttributes: readonly SourceHash[];
}

export class InvalidHashListError extends Error {
  override readonly name = 'InvalidHashListError';

  constructor() {
    super(
      'csp-hashes.json needs scripts and styleAttributes as lists of sha256 hashes',
    );
  }
}

type Attributes = ReadonlyMap<string, string>;

interface ParsedElement {
  readonly attributes: Attributes;
  readonly scriptBody: string | undefined;
}

const ATTRIBUTES_PATTERN =
  '((?:\\s+[^\\s"\'=/>]+(?:\\s*=\\s*(?:"[^"]*"|\'[^\']*\'|[^\\s"\'=<>`]+))?)*)';
const ELEMENT = new RegExp(
  `<script\\b${ATTRIBUTES_PATTERN}\\s*>([\\s\\S]*?)</script\\s*>|<[a-z][\\w:-]*${ATTRIBUTES_PATTERN}\\s*/?>`,
  'gi',
);
const ATTRIBUTE =
  /([^\s"'=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const CHARACTER_REFERENCE = /&(#\d+|#x[0-9a-f]+|quot|apos|amp|lt|gt);/gi;
const EXECUTABLE_SCRIPT_TYPES = new Set([
  '',
  'module',
  'text/javascript',
  'application/javascript',
]);
const NAMED_CHARACTERS: Readonly<Record<string, string>> = {
  quot: '"',
  apos: "'",
  amp: '&',
  lt: '<',
  gt: '>',
};
const DECIMAL_RADIX = 10;
const HEXADECIMAL_RADIX = 16;

function textOf(captured: string | undefined): string {
  return captured ?? '';
}

function decodeCharacterReferences(value: string): string {
  return value.replace(CHARACTER_REFERENCE, (reference, name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.startsWith('#x')) {
      return String.fromCodePoint(
        Number.parseInt(lowerName.slice(2), HEXADECIMAL_RADIX),
      );
    }
    if (lowerName.startsWith('#')) {
      return String.fromCodePoint(
        Number.parseInt(lowerName.slice(1), DECIMAL_RADIX),
      );
    }
    return NAMED_CHARACTERS[lowerName] ?? reference;
  });
}

function attributesOf(source: string): Attributes {
  return new Map(
    [...source.matchAll(ATTRIBUTE)].map(
      ([, name, doubleQuoted, singleQuoted, unquoted]) => [
        textOf(name).toLowerCase(),
        decodeCharacterReferences(
          textOf(doubleQuoted ?? singleQuoted ?? unquoted),
        ),
      ],
    ),
  );
}

function parsedElementsOf(document: string): readonly ParsedElement[] {
  return [...document.matchAll(ELEMENT)].map(
    ([, scriptAttributes, scriptBody, tagAttributes]) => ({
      attributes: attributesOf(textOf(scriptAttributes ?? tagAttributes)),
      scriptBody,
    }),
  );
}

function hashOf(source: string): SourceHash {
  return `sha256-${createHash('sha256').update(source).digest('base64')}`;
}

function isExecutableInline({ attributes }: ParsedElement): boolean {
  const type = textOf(attributes.get('type')).trim().toLowerCase();
  return !attributes.has('src') && EXECUTABLE_SCRIPT_TYPES.has(type);
}

function inlineScriptsOf(document: string): readonly string[] {
  return parsedElementsOf(document).flatMap((element) =>
    element.scriptBody !== undefined && isExecutableInline(element)
      ? [element.scriptBody]
      : [],
  );
}

function styleAttributesOf(document: string): readonly string[] {
  return parsedElementsOf(document).flatMap(({ attributes }) => {
    const style = attributes.get('style');
    return style === undefined ? [] : [style];
  });
}

function uniqueSortedHashes(sources: readonly string[]): readonly SourceHash[] {
  return [...new Set(sources.map(hashOf))].sort();
}

function isSourceHash(value: unknown): value is SourceHash {
  return typeof value === 'string' && value.startsWith('sha256-');
}

function hashListOf(value: unknown): readonly SourceHash[] {
  if (!(Array.isArray(value) && value.every(isSourceHash))) {
    throw new InvalidHashListError();
  }
  return value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readInlineSourceHashes(value: unknown): InlineSourceHashes {
  if (!isRecord(value)) {
    throw new InvalidHashListError();
  }
  const { scripts, styleAttributes } = value;
  return {
    scripts: hashListOf(scripts),
    styleAttributes: hashListOf(styleAttributes),
  };
}

export function inlineSourceHashes(
  documents: readonly string[],
): InlineSourceHashes {
  return {
    scripts: uniqueSortedHashes(documents.flatMap(inlineScriptsOf)),
    styleAttributes: uniqueSortedHashes(documents.flatMap(styleAttributesOf)),
  };
}
