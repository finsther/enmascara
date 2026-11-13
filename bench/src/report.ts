export const SCENARIO_NAMES = [
  'clean-lines',
  'mixed-lines',
  'dense-lines',
  'records',
] as const;

export type ScenarioName = (typeof SCENARIO_NAMES)[number];

export interface ScenarioMeasurement {
  readonly scenario: ScenarioName;
  readonly megabytesPerSecond: number;
}

export interface BenchmarkResults {
  readonly measuredOn: string;
  readonly node: string;
  readonly cpu: string;
  readonly measurements: readonly ScenarioMeasurement[];
}

export type ScenarioFloors = Readonly<Record<ScenarioName, number>>;

export interface SlowScenario extends ScenarioMeasurement {
  readonly floor: number;
}

const BYTES_PER_MEGABYTE = 1_000_000;
const MILLISECONDS_PER_SECOND = 1000;
const TABLE_DECIMALS = 1;
const SECTION_START = '<!-- benchmark:start -->';
const SECTION_END = '<!-- benchmark:end -->';

const SCENARIO_LABELS: Readonly<Record<ScenarioName, string>> = {
  'clean-lines': 'Logs sin identificadores, `text()` por línea',
  'mixed-lines': 'Logs con un identificador cada 20 líneas, `text()` por línea',
  'dense-lines': 'Logs con un identificador en cada línea, `text()` por línea',
  records: 'Registros JSON, `object()`',
};

export function megabytesPerSecond(
  bytes: number,
  meanMilliseconds: number,
): number {
  if (!(Number.isFinite(meanMilliseconds) && meanMilliseconds > 0)) {
    throw new RangeError('meanMilliseconds must be a positive finite number');
  }
  return (
    bytes / BYTES_PER_MEGABYTE / (meanMilliseconds / MILLISECONDS_PER_SECOND)
  );
}

export function findSlowScenarios(
  measurements: readonly ScenarioMeasurement[],
  floors: ScenarioFloors,
): readonly SlowScenario[] {
  return measurements
    .map((measurement) => ({
      ...measurement,
      floor: floors[measurement.scenario],
    }))
    .filter(({ megabytesPerSecond, floor }) => megabytesPerSecond < floor);
}

export function renderBenchmarkTable(results: BenchmarkResults): string {
  const rows = results.measurements.map(
    ({ scenario, megabytesPerSecond }) =>
      `| ${SCENARIO_LABELS[scenario]} | ${megabytesPerSecond.toFixed(TABLE_DECIMALS)} |`,
  );
  return [
    '| Escenario | MB/s |',
    '| --- | ---: |',
    ...rows,
    '',
    `Medido el ${results.measuredOn} con Node ${results.node} en ${results.cpu}, sobre 1 MiB por escenario.`,
  ].join('\n');
}

export function replaceBenchmarkSection(readme: string, table: string): string {
  const start = readme.indexOf(SECTION_START);
  const end = readme.indexOf(SECTION_END);
  if (start === -1 || end < start) {
    throw new RangeError('The README has no benchmark section');
  }
  return [
    readme.slice(0, start + SECTION_START.length),
    table,
    readme.slice(end),
  ].join('\n');
}
