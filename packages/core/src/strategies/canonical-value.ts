const NOT_PART_OF_AN_IDENTIFIER = /[^0-9A-ZÑ&]/gu;

export function canonicalValue(value: string): string {
  return [...value]
    .map((character) => character.normalize('NFKC').toUpperCase())
    .join('')
    .replace(NOT_PART_OF_AN_IDENTIFIER, '');
}
