import { describe, expect, it } from 'vitest';
import { measureScenarios } from '../src/measure.ts';
import type { PreparedScenario } from '../src/scenarios.ts';

const QUICK_RUN = { time: 20, warmupTime: 5 } as const;

describe('measureScenarios', () => {
  it('reports positive MB/s for each scenario, in order', async () => {
    const scenarios: readonly PreparedScenario[] = [
      { name: 'clean-lines', bytes: 1000, run: () => undefined },
      { name: 'records', bytes: 2000, run: () => undefined },
    ];

    const measurements = await measureScenarios(scenarios, QUICK_RUN);

    expect(measurements.map(({ scenario }) => scenario)).toEqual([
      'clean-lines',
      'records',
    ]);
    for (const { megabytesPerSecond } of measurements) {
      expect(megabytesPerSecond).toBeGreaterThan(0);
    }
  });

  it('measures more MB/s for more bytes in the same time', async () => {
    const busyWait = (): void => {
      const end = performance.now() + 1;
      let now = performance.now();
      while (now < end) {
        now = performance.now();
      }
    };
    const [small, large] = await measureScenarios(
      [
        { name: 'clean-lines', bytes: 1000, run: busyWait },
        { name: 'records', bytes: 100_000, run: busyWait },
      ],
      QUICK_RUN,
    );

    expect(large?.megabytesPerSecond).toBeGreaterThan(
      (small?.megabytesPerSecond ?? 0) * 10,
    );
  });

  it('fails when a scenario throws', async () => {
    const failing: PreparedScenario = {
      name: 'records',
      bytes: 1,
      run: () => {
        throw new Error('boom');
      },
    };

    await expect(measureScenarios([failing], QUICK_RUN)).rejects.toThrow(
      'records',
    );
  });
});
