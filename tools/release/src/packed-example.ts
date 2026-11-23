export class MissingTarballError extends Error {
  override readonly name = 'MissingTarballError';
}

export class UnreadablePackOutputError extends Error {
  override readonly name = 'UnreadablePackOutputError';
}

type Manifest = Readonly<Record<string, unknown>>;
type DependencyRanges = Readonly<Record<string, unknown>>;

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies'] as const;
const WORKSPACE_PROTOCOL = 'workspace:';

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fromTarball(
  name: string,
  range: unknown,
  tarballs: ReadonlyMap<string, string>,
): unknown {
  if (typeof range !== 'string' || !range.startsWith(WORKSPACE_PROTOCOL)) {
    return range;
  }
  const tarball = tarballs.get(name);
  if (tarball === undefined) {
    throw new MissingTarballError(
      `${name} comes from the workspace but was not packed`,
    );
  }
  return `file:${tarball}`;
}

function rangesFromTarballs(
  ranges: DependencyRanges,
  tarballs: ReadonlyMap<string, string>,
): DependencyRanges {
  return Object.fromEntries(
    Object.entries(ranges).map(([name, range]) => [
      name,
      fromTarball(name, range, tarballs),
    ]),
  );
}

export function packedManifest(
  manifest: Manifest,
  tarballs: ReadonlyMap<string, string>,
): Manifest {
  const packedFields = DEPENDENCY_FIELDS.flatMap((field) => {
    const ranges = manifest[field];
    return isRecord(ranges)
      ? [[field, rangesFromTarballs(ranges, tarballs)] as const]
      : [];
  });
  return { ...manifest, ...Object.fromEntries(packedFields) };
}

function parsedJson(output: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    return undefined;
  }
}

export function packedFileName(output: string): string {
  const parsed = parsedJson(output);
  const entry: unknown = Array.isArray(parsed) ? parsed[0] : undefined;
  const { filename: fileName } = isRecord(entry) ? entry : {};
  if (typeof fileName === 'string') {
    return fileName;
  }
  throw new UnreadablePackOutputError('npm pack did not report a tarball');
}
