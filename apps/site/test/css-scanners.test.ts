import { describe, expect, it } from 'vitest';
import {
  colorLiteralsIn,
  customPropertiesDeclaredIn,
  customPropertiesUsedIn,
  declarationsInRule,
} from './support/css-scanners.ts';

describe('colorLiteralsIn', () => {
  it.each([
    ['a: #fff;', '#fff'],
    ['a: #FF7DC0;', '#FF7DC0'],
    ['a: #ff7dc080;', '#ff7dc080'],
    ['a: rgb(1 2 3);', 'rgb(1 2 3)'],
    ['a: rgba(0, 0, 0, 0.25);', 'rgba(0, 0, 0, 0.25)'],
    ['a: hsl(224, 10%, 10%);', 'hsl(224, 10%, 10%)'],
    ['a: oklch(70% 0.1 200);', 'oklch(70% 0.1 200)'],
    ['color: white;', 'white'],
    ['background: red url(a.png);', 'red'],
    ['<p style="color: navy">', 'navy'],
    ['border-left-color: Tomato;', 'tomato'],
  ])('finds the color in %s', (text, color) => {
    expect(colorLiteralsIn(text)).toEqual([color]);
  });

  it.each([
    '<a href="#instalar">',
    'color: var(--color-ink-950);',
    'fill: var(--color-pink-700); stroke: var(--color-gold-500);',
    'color: currentColor;',
    'background: transparent;',
    '<p>El texto dice white y red.</p>',
    'const id = "#bad-anchor";',
  ])('finds no color in %s', (text) => {
    expect(colorLiteralsIn(text)).toEqual([]);
  });
});

describe('custom properties', () => {
  it('reads declarations with their trimmed values', () => {
    expect(
      customPropertiesDeclaredIn(':root { --a: 1px; --b-c:  var(--a) }'),
    ).toEqual(
      new Map([
        ['--a', '1px'],
        ['--b-c', 'var(--a)'],
      ]),
    );
  });

  it('reads the properties a text uses', () => {
    expect(
      customPropertiesUsedIn('a { color: var(--x); margin: var( --y, 1px) }'),
    ).toEqual(new Set(['--x', '--y']));
  });

  it('reads the declarations of one rule only', () => {
    const css = `:root { --a: 1; }\n:root[data-theme='dark'] { --b: 2; }`;

    expect(declarationsInRule(css, ":root[data-theme='dark']")).toEqual(
      new Map([['--b', '2']]),
    );
    expect(declarationsInRule(css, '.missing')).toEqual(new Map());
  });
});
