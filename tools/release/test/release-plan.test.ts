import { describe, expect, it } from 'vitest';
import type {
  PackageRegistry,
  PublishablePackage,
  RegistryRecord,
} from '../src/release-plan.ts';
import { planRelease, UnreservedPackagesError } from '../src/release-plan.ts';

const RESERVATION = '0.0.0';

function publishable(
  name: string,
  version: string,
  peerDependencies: readonly string[] = [],
): PublishablePackage {
  return {
    name,
    version,
    directory: `packages/${name}`,
    peerDependencies,
  };
}

function registryWith(
  records: Readonly<Record<string, RegistryRecord>>,
): PackageRegistry {
  return {
    record: async (name) =>
      Object.hasOwn(records, name)
        ? (records[name] ?? { kind: 'unreserved' })
        : { kind: 'unreserved' },
  };
}

function reserved(...versions: readonly string[]): RegistryRecord {
  return { kind: 'reserved', versions };
}

const NO_TAGS: ReadonlySet<string> = new Set();

describe('planRelease', () => {
  it('publishes and tags a version npm does not have', async () => {
    const steps = await planRelease(
      [publishable('enmascara', '0.1.1')],
      registryWith({ enmascara: reserved(RESERVATION, '0.1.0') }),
      new Set(['enmascara@0.1.0']),
    );

    expect(steps).toEqual([
      {
        name: 'enmascara',
        version: '0.1.1',
        directory: 'packages/enmascara',
        tag: 'enmascara@0.1.1',
        action: 'publish',
      },
    ]);
  });

  it('does nothing with a version that is published and tagged', async () => {
    const steps = await planRelease(
      [publishable('enmascara', '0.1.0')],
      registryWith({ enmascara: reserved(RESERVATION, '0.1.0') }),
      new Set(['enmascara@0.1.0']),
    );

    expect(steps.map(({ action }) => action)).toEqual(['none']);
  });

  it('only tags a version that was published without its tag', async () => {
    const steps = await planRelease(
      [publishable('enmascara', '0.1.0')],
      registryWith({ enmascara: reserved(RESERVATION, '0.1.0') }),
      NO_TAGS,
    );

    expect(steps.map(({ action }) => action)).toEqual(['tag']);
  });

  it('never publishes or tags the 0.0.0 reservation', async () => {
    const steps = await planRelease(
      [
        publishable('enmascara-pino', RESERVATION),
        publishable('enmascara-sentry', RESERVATION),
      ],
      registryWith({ 'enmascara-sentry': reserved(RESERVATION) }),
      NO_TAGS,
    );

    expect(steps.map(({ action }) => action)).toEqual(['none', 'none']);
  });

  it('refuses the whole release when a package to publish is not reserved', async () => {
    const plan = planRelease(
      [
        publishable('enmascara', '0.1.1'),
        publishable('enmascara-express', '0.1.0'),
        publishable('enmascara-pino', '0.1.0'),
      ],
      registryWith({ enmascara: reserved(RESERVATION, '0.1.0') }),
      NO_TAGS,
    );

    await expect(plan).rejects.toBeInstanceOf(UnreservedPackagesError);
    await expect(plan).rejects.toMatchObject({
      name: 'UnreservedPackagesError',
      packageNames: ['enmascara-express', 'enmascara-pino'],
    });
  });

  it('says which packages to reserve and how', async () => {
    const plan = planRelease(
      [publishable('enmascara-pino', '0.1.0')],
      registryWith({}),
      NO_TAGS,
    );

    await expect(plan).rejects.toThrow(
      'Reserve enmascara-pino on npm with version 0.0.0 and configure trusted publishing before releasing it',
    );
  });

  it('releases every package after the packages it depends on', async () => {
    const steps = await planRelease(
      [
        publishable('enmascara-sentry', '0.1.0', ['@sentry/node', 'enmascara']),
        publishable('enmascara-express', '0.1.0', ['enmascara', 'express']),
        publishable('enmascara', '0.1.1'),
      ],
      registryWith({
        enmascara: reserved(RESERVATION),
        'enmascara-express': reserved(RESERVATION),
        'enmascara-sentry': reserved(RESERVATION),
      }),
      NO_TAGS,
    );

    expect(steps.map(({ name }) => name)).toEqual([
      'enmascara',
      'enmascara-express',
      'enmascara-sentry',
    ]);
  });

  it('releases a dependency first even when its name sorts last', async () => {
    const steps = await planRelease(
      [
        publishable('a-integration', RESERVATION, ['z-core']),
        publishable('z-core', RESERVATION),
      ],
      registryWith({}),
      NO_TAGS,
    );

    expect(steps.map(({ name }) => name)).toEqual(['z-core', 'a-integration']);
  });

  it('names every package to reserve in its message', async () => {
    await expect(
      planRelease(
        [
          publishable('enmascara-pino', '0.1.0'),
          publishable('enmascara-sentry', '0.1.0'),
        ],
        registryWith({}),
        NO_TAGS,
      ),
    ).rejects.toThrow(
      'Reserve enmascara-pino, enmascara-sentry on npm with version 0.0.0',
    );
  });

  it('orders packages without dependencies between them by name', async () => {
    const steps = await planRelease(
      [publishable('b', RESERVATION), publishable('a', RESERVATION)],
      registryWith({}),
      NO_TAGS,
    );

    expect(steps.map(({ name }) => name)).toEqual(['a', 'b']);
  });

  it('still releases packages that depend on each other, by name', async () => {
    const steps = await planRelease(
      [
        publishable('b', RESERVATION, ['a']),
        publishable('a', RESERVATION, ['b']),
      ],
      registryWith({}),
      NO_TAGS,
    );

    expect(steps.map(({ name }) => name)).toEqual(['a', 'b']);
  });
});
