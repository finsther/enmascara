import type { PackageRegistry, RegistryRecord } from './release-plan.ts';
import type { RunCommand } from './run-command.ts';

export class RegistryUnavailableError extends Error {
  override readonly name = 'RegistryUnavailableError';
}

const NOT_FOUND_CODE = 'E404';

function parsedJson(output: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    return undefined;
  }
}

function isNotFound(output: string): boolean {
  const parsed = parsedJson(output);
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'error' in parsed &&
    typeof parsed.error === 'object' &&
    parsed.error !== null &&
    'code' in parsed.error &&
    parsed.error.code === NOT_FOUND_CODE
  );
}

function versionsIn(output: string): readonly string[] | undefined {
  const parsed = parsedJson(output);
  if (typeof parsed === 'string') {
    return [parsed];
  }
  if (
    Array.isArray(parsed) &&
    parsed.every((version) => typeof version === 'string')
  ) {
    return parsed;
  }
  return undefined;
}

export function createNpmRegistry(run: RunCommand): PackageRegistry {
  return {
    record: async (name): Promise<RegistryRecord> => {
      const outcome = await run('npm', ['view', name, 'versions', '--json']);
      if (outcome.kind === 'failed' && isNotFound(outcome.output)) {
        return { kind: 'unreserved' };
      }
      const versions =
        outcome.kind === 'succeeded' ? versionsIn(outcome.output) : undefined;
      if (versions === undefined) {
        throw new RegistryUnavailableError(
          `npm did not report the versions of ${name}`,
        );
      }
      return { kind: 'reserved', versions };
    },
  };
}
