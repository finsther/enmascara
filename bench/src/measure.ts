import { Bench } from 'tinybench';
import { megabytesPerSecond, type ScenarioMeasurement } from './report.ts';
import type { PreparedScenario } from './scenarios.ts';

export interface MeasureOptions {
  readonly time: number;
  readonly warmupTime: number;
}

export async function measureScenarios(
  scenarios: readonly PreparedScenario[],
  options: MeasureOptions,
): Promise<readonly ScenarioMeasurement[]> {
  const bench = new Bench({
    time: options.time,
    warmupTime: options.warmupTime,
  });
  for (const scenario of scenarios) {
    bench.add(scenario.name, scenario.run);
  }
  await bench.run();
  return scenarios.map((scenario) => {
    const result = bench.getTask(scenario.name)?.result;
    if (result?.state !== 'completed') {
      throw new Error(`Scenario ${scenario.name} did not complete`);
    }
    return {
      scenario: scenario.name,
      megabytesPerSecond: megabytesPerSecond(
        scenario.bytes,
        result.latency.mean,
      ),
    };
  });
}
