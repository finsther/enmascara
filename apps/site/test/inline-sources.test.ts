import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  InvalidHashListError,
  inlineSourceHashes,
  readInlineSourceHashes,
} from '../csp/inline-sources.ts';

function hashOf(source: string): string {
  return `sha256-${createHash('sha256').update(source).digest('base64')}`;
}

describe('inlineSourceHashes', () => {
  it('hashes the exact text of every inline script', () => {
    const script = "\n\t(() => { document.body.dataset.ready = 'yes'; })();\n";

    expect(inlineSourceHashes([`<script>${script}</script>`])).toEqual({
      scripts: [hashOf(script)],
      styleAttributes: [],
    });
  });

  it('hashes inline module scripts and classic scripts with a type', () => {
    const hashes = inlineSourceHashes([
      '<script type="module">first()</script>',
      '<script type="text/javascript">second()</script>',
      '<script aria-hidden="true">third()</script>',
    ]);

    expect(hashes.scripts).toEqual(
      [hashOf('first()'), hashOf('second()'), hashOf('third()')].sort(),
    );
  });

  it('reads the script type regardless of case and spacing', () => {
    expect(
      inlineSourceHashes(['<script type=" MODULE ">run()</script>']).scripts,
    ).toEqual([hashOf('run()')]);
  });

  it('ignores scripts loaded from a file and data blocks', () => {
    expect(
      inlineSourceHashes([
        '<script type="module" src="/_astro/page.js"></script>',
        '<script type="application/ld+json">{"name":"Enmascara"}</script>',
      ]).scripts,
    ).toEqual([]);
  });

  it('hashes every style attribute value as the browser reads it', () => {
    const hashes = inlineSourceHashes([
      '<svg style="--sl-icon-size: 1em;"></svg>',
      `<span style='--0:#82AAFF'></span>`,
      '<p style="font-family: &quot;IBM Plex Mono&quot; &amp; more"></p>',
    ]);

    expect(hashes.styleAttributes).toEqual(
      [
        hashOf('--sl-icon-size: 1em;'),
        hashOf('--0:#82AAFF'),
        hashOf('font-family: "IBM Plex Mono" & more'),
      ].sort(),
    );
  });

  it('decodes numeric and named references in style attributes', () => {
    expect(
      inlineSourceHashes([
        '<b style="content: &#34;a&#39;b&lt;c&gt;&#x27;"></b>',
      ]).styleAttributes,
    ).toEqual([hashOf(`content: "a'b<c>'`)]);
  });

  it('hashes an empty style attribute', () => {
    expect(inlineSourceHashes(['<i style></i>']).styleAttributes).toEqual([
      hashOf(''),
    ]);
  });

  it('reads style attributes of script elements but not of text inside scripts', () => {
    expect(
      inlineSourceHashes([
        `<script style="a: 1">const markup = '<b style="b: 2">';</script>`,
      ]).styleAttributes,
    ).toEqual([hashOf('a: 1')]);
  });

  it('lists each hash once across every document, sorted', () => {
    const page = '<script>same()</script><i style="a: 1"></i>';

    expect(inlineSourceHashes([page, page])).toEqual({
      scripts: [hashOf('same()')],
      styleAttributes: [hashOf('a: 1')],
    });
  });

  it('does not read a style attribute out of another attribute', () => {
    expect(
      inlineSourceHashes(['<a data-style="a: 1" title=\' style="b: 2"\'></a>'])
        .styleAttributes,
    ).toEqual([]);
  });
});

describe('readInlineSourceHashes', () => {
  it('accepts lists of sha256 hashes', () => {
    const hashes = {
      scripts: ['sha256-a='],
      styleAttributes: ['sha256-b=', 'sha256-c='],
    };

    expect(readInlineSourceHashes(hashes)).toEqual(hashes);
  });

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a list', []],
    ['no style attributes', { scripts: [] }],
    [
      'scripts that are not a list',
      { scripts: 'sha256-a=', styleAttributes: [] },
    ],
    ['a hash that is not sha256', { scripts: ['md5-a'], styleAttributes: [] }],
    ['a hash that is not text', { scripts: [], styleAttributes: [1] }],
    [
      'one bad hash among good ones',
      { scripts: ['sha256-a='], styleAttributes: ['sha256-b=', 'md5-c'] },
    ],
  ])('rejects %s', (_description, value) => {
    expect(() => readInlineSourceHashes(value)).toThrow(InvalidHashListError);
    expect(() => readInlineSourceHashes(value)).toThrow(
      'csp-hashes.json needs scripts and styleAttributes as lists of sha256 hashes',
    );
  });

  it('names its error', () => {
    expect(new InvalidHashListError().name).toBe('InvalidHashListError');
  });
});
