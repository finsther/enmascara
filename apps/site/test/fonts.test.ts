import { describe, expect, it } from 'vitest';
import { builtFiles, readBuilt } from './support/build-output.ts';

interface FontFace {
  readonly family: string;
  readonly weight: string;
  readonly sources: readonly string[];
}

const FONT_FACE = /@font-face\s*\{([^}]*)\}/g;
const FONT_FAMILY = /font-family:\s*['"]?([^;'"]+)['"]?/;
const FONT_WEIGHT = /font-weight:\s*(\d+)/;
const SOURCE_URL = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
const CSS_URL = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
const CSS_IMPORT = /@import\s+(?:url\()?\s*['"]?([^'")\s;]+)/g;
const ALLOWED_SUBSET = /-(?:latin|latin-ext)-\d{3}-normal\./;
const SAME_ORIGIN = /^(?:\/(?!\/)|\.\.?\/|data:)/;

const EXPECTED_FACES = [
  'Anton 400',
  'IBM Plex Mono 400',
  'IBM Plex Mono 500',
  'IBM Plex Sans 400',
  'IBM Plex Sans 500',
  'IBM Plex Sans 600',
];

function builtCss(): readonly string[] {
  return builtFiles('.css').map(readBuilt);
}

function fontFaces(): readonly FontFace[] {
  return builtCss().flatMap((css) =>
    [...css.matchAll(FONT_FACE)].map(([, body = '']) => ({
      family: FONT_FAMILY.exec(body)?.[1]?.trim() ?? '',
      weight: FONT_WEIGHT.exec(body)?.[1] ?? '',
      sources: [...body.matchAll(SOURCE_URL)].map(([, url = '']) => url),
    })),
  );
}

describe('built fonts', () => {
  it('serves Anton, IBM Plex Sans and IBM Plex Mono in the weights of the design', () => {
    const faces = new Set(
      fontFaces().map(({ family, weight }) => `${family} ${weight}`),
    );

    expect([...faces].sort()).toEqual(EXPECTED_FACES);
  });

  it('ships only the latin and latin-ext subsets', () => {
    const sources = fontFaces().flatMap(({ sources }) => sources);

    expect(sources.length).toBeGreaterThan(0);
    expect(sources.filter((source) => !ALLOWED_SUBSET.test(source))).toEqual(
      [],
    );
  });

  it('loads every font, image and stylesheet from the same origin', () => {
    const references = builtCss().flatMap((css) => [
      ...[...css.matchAll(CSS_URL)].map(([, url = '']) => url),
      ...[...css.matchAll(CSS_IMPORT)].map(([, url = '']) => url),
    ]);

    expect(references.length).toBeGreaterThan(0);
    expect(references.filter((url) => !SAME_ORIGIN.test(url))).toEqual([]);
  });
});
