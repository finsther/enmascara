import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ringSources, ringSourceViolations } from '../support/ring-sources.ts';

const RING_PATH = join(resolve(import.meta.dirname, '../..'), 'src/ring/x.ts');

function violationsOf(code: string): readonly string[] {
  return ringSourceViolations({ path: RING_PATH, code });
}

describe('ringSourceViolations', () => {
  it('accepts the package and modules of the ring', () => {
    expect(
      violationsOf(
        "import { createRedactor } from 'enmascara';\nimport { runRing } from './run-ring.ts';\nconst load = () => import('./dom/controller.ts');",
      ),
    ).toEqual([]);
  });

  it('rejects regular expression literals', () => {
    expect(violationsOf('const clabe = /\\d{18}/;')).toEqual([
      'regular expression literal',
    ]);
  });

  it('rejects building regular expressions', () => {
    expect(violationsOf("const clabe = new RegExp('\\\\d{18}');")).toEqual([
      'identifier RegExp',
    ]);
  });

  it('rejects imports outside the package and the ring', () => {
    expect(
      violationsOf(
        "import { isValid } from '../validators/clabe.ts';\nimport { x } from 'other';\nexport { y } from 'z';",
      ),
    ).toEqual(['import ../validators/clabe.ts', 'import other', 'import z']);
  });

  it('rejects dynamic imports that are not literal paths', () => {
    expect(violationsOf('const load = (path) => import(path);')).toEqual([
      'dynamic import without a literal path',
    ]);
  });

  it('rejects network, storage, history and HTML-writing APIs', () => {
    expect(
      violationsOf(
        [
          "fetch('/x');",
          'new XMLHttpRequest();',
          "new WebSocket('ws://x');",
          "new EventSource('/x');",
          "navigator.sendBeacon('/x');",
          "localStorage.setItem('a', 'b');",
          "sessionStorage.setItem('a', 'b');",
          "indexedDB.open('a');",
          "document.cookie = 'a=b';",
          "history.pushState({}, '', '/x');",
          "element.innerHTML = 'x';",
          "element.outerHTML = 'x';",
          "element.insertAdjacentHTML('beforeend', 'x');",
        ].join('\n'),
      ),
    ).toEqual([
      'identifier fetch',
      'identifier XMLHttpRequest',
      'identifier WebSocket',
      'identifier EventSource',
      'identifier sendBeacon',
      'identifier localStorage',
      'identifier sessionStorage',
      'identifier indexedDB',
      'identifier cookie',
      'identifier history',
      'identifier innerHTML',
      'identifier outerHTML',
      'identifier insertAdjacentHTML',
    ]);
  });
});

describe('ring island sources', () => {
  it('exist', () => {
    expect(ringSources().length).toBeGreaterThan(0);
  });

  it.each(ringSources().map(({ path, code }) => ({ path, code })))(
    'define no detection, network or storage of their own in $path',
    (source) => {
      expect(ringSourceViolations(source)).toEqual([]);
    },
  );
});
