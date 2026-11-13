import { describe, expect, it } from 'vitest';
import {
  type BenchmarkResults,
  findSlowScenarios,
  megabytesPerSecond,
  renderBenchmarkTable,
  replaceBenchmarkSection,
} from '../src/report.ts';

const RESULTS: BenchmarkResults = {
  measuredOn: '2026-11-10',
  node: 'v24.22.1',
  cpu: 'Test CPU',
  measurements: [
    { scenario: 'clean-lines', megabytesPerSecond: 120.04 },
    { scenario: 'mixed-lines', megabytesPerSecond: 80.55 },
    { scenario: 'dense-lines', megabytesPerSecond: 20 },
    { scenario: 'records', megabytesPerSecond: 15.25 },
  ],
};

describe('megabytesPerSecond', () => {
  it('divides decimal megabytes by seconds', () => {
    expect(megabytesPerSecond(2_000_000, 500)).toBe(4);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects a mean of %s milliseconds',
    (meanMilliseconds) => {
      expect(() => megabytesPerSecond(1, meanMilliseconds)).toThrow(RangeError);
    },
  );
});

describe('findSlowScenarios', () => {
  const floors = {
    'clean-lines': 100,
    'mixed-lines': 90,
    'dense-lines': 20,
    records: 10,
  };

  it('lists the scenarios below their floor', () => {
    expect(findSlowScenarios(RESULTS.measurements, floors)).toEqual([
      { scenario: 'mixed-lines', megabytesPerSecond: 80.55, floor: 90 },
    ]);
  });

  it('accepts a scenario exactly at its floor', () => {
    expect(
      findSlowScenarios(RESULTS.measurements, {
        ...floors,
        'mixed-lines': 80.55,
      }),
    ).toEqual([]);
  });
});

describe('renderBenchmarkTable', () => {
  it('renders one row per scenario with one decimal', () => {
    expect(renderBenchmarkTable(RESULTS)).toBe(
      [
        '| Escenario | MB/s |',
        '| --- | ---: |',
        '| Logs sin identificadores, `text()` por línea | 120.0 |',
        '| Logs con un identificador cada 20 líneas, `text()` por línea | 80.5 |',
        '| Logs con un identificador en cada línea, `text()` por línea | 20.0 |',
        '| Registros JSON, `object()` | 15.3 |',
        '',
        'Medido el 2026-11-10 con Node v24.22.1 en Test CPU, sobre 1 MiB por escenario.',
      ].join('\n'),
    );
  });
});

describe('replaceBenchmarkSection', () => {
  const readme = [
    '# Título',
    '<!-- benchmark:start -->',
    'tabla vieja',
    '<!-- benchmark:end -->',
    'Fin',
  ].join('\n');

  it('replaces only the text between the markers', () => {
    expect(replaceBenchmarkSection(readme, 'tabla nueva')).toBe(
      [
        '# Título',
        '<!-- benchmark:start -->',
        'tabla nueva',
        '<!-- benchmark:end -->',
        'Fin',
      ].join('\n'),
    );
  });

  it.each([
    ['without markers', '# Título'],
    [
      'with the end before the start',
      '<!-- benchmark:end --><!-- benchmark:start -->',
    ],
  ])('rejects a README %s', (_description, invalidReadme) => {
    expect(() => replaceBenchmarkSection(invalidReadme, 'tabla')).toThrow(
      RangeError,
    );
  });
});
