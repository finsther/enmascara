const INVISIBLE_CHARACTER = /^\p{Default_Ignorable_Code_Point}$/u;
const NOT_PART_OF_AN_IDENTIFIER = /[^0-9A-ZÑ&]/gu;

export function canonicalValue(value: string): string {
  return [...value]
    .filter((character) => !INVISIBLE_CHARACTER.test(character))
    .map((character) => character.normalize('NFKC').toUpperCase())
    .join('')
    .replace(NOT_PART_OF_AN_IDENTIFIER, '');
}
