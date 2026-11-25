import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  colorLiteralsIn,
  customPropertiesDeclaredIn,
  customPropertiesUsedIn,
  declarationsInRule,
} from './support/css-scanners.ts';

const sourceDirectory = fileURLToPath(new URL('../src', import.meta.url));
const tokensPath = join(sourceDirectory, 'styles', 'tokens.css');
const PIXELS_PER_REM = 16;
const STYLED_SOURCE_EXTENSIONS = ['.astro', '.css', '.ts', '.tsx', '.mdx'];

const DESIGN_COLORS = [
  '#16131C',
  '#1E1A25',
  '#221D29',
  '#241F2C',
  '#2B2534',
  '#2E2836',
  '#3A1B2E',
  '#3A2E0A',
  '#3A3345',
  '#4A3700',
  '#4A3A0E',
  '#4F4859',
  '#5A5266',
  '#5C5566',
  '#7A5A00',
  '#8A8294',
  '#8E86A0',
  '#8F004E',
  '#A79F9A',
  '#A9A1B6',
  '#B9B2C4',
  '#C2006A',
  '#C4BCCF',
  '#C9BFB2',
  '#CFC6BA',
  '#D9D2E3',
  '#DED5C9',
  '#E3DDEA',
  '#E8C766',
  '#E9E3F0',
  '#EFE7DC',
  '#F1EAE0',
  '#F2C230',
  '#F3E3EC',
  '#F5F1EA',
  '#F6DE8A',
  '#FBE7A8',
  '#FBF7F2',
  '#FF5AAE',
  '#FF7DC0',
  '#FFB3DA',
  '#FFF4D6',
  '#FFFFFF',
  'rgba(10, 8, 14, 0.55)',
  'rgba(0, 0, 0, 0.25)',
];
const DESIGN_FONT_SIZES_IN_PIXELS = [
  11, 12, 12.5, 13, 13.5, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 28,
  30, 32, 38, 40, 42, 44, 52, 56, 64, 80, 88,
];
const DESIGN_SPACES_IN_PIXELS = [
  2, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48,
  56, 72, 80, 88, 96, 104,
];
const DESIGN_RADII_IN_PIXELS = [4, 6, 8, 10, 12, 14, 16, 18];
const DESIGN_LINE_HEIGHTS = [
  '0.95',
  '0.98',
  '1',
  '1.02',
  '1.5',
  '1.55',
  '1.6',
  '1.65',
  '1.7',
  '1.75',
];
const STARLIGHT_THEME_COLORS = [
  '--sl-color-white',
  '--sl-color-gray-1',
  '--sl-color-gray-2',
  '--sl-color-gray-3',
  '--sl-color-gray-4',
  '--sl-color-gray-5',
  '--sl-color-gray-6',
  '--sl-color-black',
  '--sl-color-accent-low',
  '--sl-color-accent',
  '--sl-color-accent-high',
  '--sl-color-text',
  '--sl-color-text-accent',
  '--sl-color-bg',
  '--sl-color-bg-nav',
  '--sl-color-bg-sidebar',
  '--sl-color-bg-inline-code',
  '--sl-color-hairline',
  '--sl-color-orange-low',
  '--sl-color-orange-high',
];

function readTokens(): string {
  return readFileSync(tokensPath, 'utf8');
}

function styledSources(): readonly string[] {
  return readdirSync(sourceDirectory, { recursive: true, encoding: 'utf8' })
    .filter((path) =>
      STYLED_SOURCE_EXTENSIONS.some((extension) => path.endsWith(extension)),
    )
    .map((path) => join(sourceDirectory, path));
}

function numericValuesOf(tokens: string, prefix: string): readonly number[] {
  return [...customPropertiesDeclaredIn(tokens)]
    .filter(([name]) => name.startsWith(prefix))
    .map(([, value]) =>
      value.endsWith('rem')
        ? Number.parseFloat(value) * PIXELS_PER_REM
        : Number.parseFloat(value),
    )
    .sort((first, second) => first - second);
}

describe('tokens.css', () => {
  it('defines every color of the design exactly once', () => {
    const colors = colorLiteralsIn(readTokens()).map((color) =>
      color.toUpperCase(),
    );

    expect([...colors].sort()).toEqual(
      DESIGN_COLORS.map((color) => color.toUpperCase()).sort(),
    );
  });

  it('keeps the font families of the design', () => {
    const declared = customPropertiesDeclaredIn(readTokens());

    expect(declared.get('--font-display')).toMatch(/^Anton, /);
    expect(declared.get('--font-body')).toMatch(/^['"]IBM Plex Sans['"], /);
    expect(declared.get('--font-code')).toMatch(/^['"]IBM Plex Mono['"], /);
  });

  it('keeps the type scale of the design', () => {
    expect(numericValuesOf(readTokens(), '--font-size-')).toEqual(
      DESIGN_FONT_SIZES_IN_PIXELS,
    );
  });

  it('keeps the line heights of the design', () => {
    const lineHeights = [...customPropertiesDeclaredIn(readTokens())]
      .filter(([name]) => name.startsWith('--line-height-'))
      .map(([, value]) => value)
      .sort((first, second) => Number(first) - Number(second));

    expect(lineHeights).toEqual(DESIGN_LINE_HEIGHTS);
  });

  it('keeps the spacing of the design', () => {
    expect(numericValuesOf(readTokens(), '--space-')).toEqual(
      DESIGN_SPACES_IN_PIXELS,
    );
  });

  it('keeps the radii of the design and a pill radius', () => {
    const tokens = readTokens();

    expect(numericValuesOf(tokens, '--radius-').slice(0, -1)).toEqual(
      DESIGN_RADII_IN_PIXELS,
    );
    expect(customPropertiesDeclaredIn(tokens).get('--radius-pill')).toBe(
      '999px',
    );
  });

  it.each(['light', 'dark'])(
    'gives the %s documentation theme every Starlight color from the palette',
    (theme) => {
      const declarations = declarationsInRule(
        readTokens(),
        `:root[data-theme="${theme}"]`,
      );

      expect([...declarations.keys()].sort()).toEqual(
        [...STARLIGHT_THEME_COLORS].sort(),
      );
      for (const value of declarations.values()) {
        expect(value).toMatch(/^var\(--color-[a-z0-9-]+\)$/);
      }
    },
  );
});

describe('styles outside tokens.css', () => {
  it('contain no color literal', () => {
    const offenders = styledSources()
      .filter((path) => path !== tokensPath)
      .flatMap((path) =>
        colorLiteralsIn(readFileSync(path, 'utf8')).map(
          (color) => `${relative(sourceDirectory, path)}: ${color}`,
        ),
      );

    expect(offenders).toEqual([]);
  });

  it('use only custom properties that tokens.css or Starlight define', () => {
    const defined = customPropertiesDeclaredIn(readTokens());
    const undefinedProperties = styledSources().flatMap((path) =>
      [...customPropertiesUsedIn(readFileSync(path, 'utf8'))]
        .filter((name) => !(defined.has(name) || name.startsWith('--sl-')))
        .map((name) => `${relative(sourceDirectory, path)}: ${name}`),
    );

    expect(undefinedProperties).toEqual([]);
  });
});
