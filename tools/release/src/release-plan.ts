import { inDependencyOrder } from './dependency-order.ts';

export interface PublishablePackage {
  readonly name: string;
  readonly version: string;
  readonly directory: string;
  readonly peerDependencies: readonly string[];
}

export type RegistryRecord =
  | { readonly kind: 'unreserved' }
  | { readonly kind: 'reserved'; readonly versions: readonly string[] };

export interface PackageRegistry {
  record(name: string): Promise<RegistryRecord>;
}

export type ReleaseAction = 'publish' | 'tag' | 'none';

export interface ReleaseStep {
  readonly name: string;
  readonly version: string;
  readonly directory: string;
  readonly tag: string;
  readonly action: ReleaseAction;
}

export const RESERVATION_VERSION = '0.0.0';

export class UnreservedPackagesError extends Error {
  override readonly name = 'UnreservedPackagesError';

  readonly packageNames: readonly string[];

  constructor(packageNames: readonly string[]) {
    super(
      `Reserve ${packageNames.join(', ')} on npm with version ${RESERVATION_VERSION} and configure trusted publishing before releasing it`,
    );
    this.packageNames = packageNames;
  }
}

interface RegisteredPackage {
  readonly publishable: PublishablePackage;
  readonly record: RegistryRecord;
}

function tagOf(publishable: PublishablePackage): string {
  return `${publishable.name}@${publishable.version}`;
}

function isReservation(publishable: PublishablePackage): boolean {
  return publishable.version === RESERVATION_VERSION;
}

function isUnreserved({ publishable, record }: RegisteredPackage): boolean {
  return record.kind === 'unreserved' && !isReservation(publishable);
}

function actionFor(
  { publishable, record }: RegisteredPackage,
  existingTags: ReadonlySet<string>,
): ReleaseAction {
  if (isReservation(publishable) || record.kind === 'unreserved') {
    return 'none';
  }
  if (!record.versions.includes(publishable.version)) {
    return 'publish';
  }
  return existingTags.has(tagOf(publishable)) ? 'none' : 'tag';
}

function stepFor(
  registered: RegisteredPackage,
  existingTags: ReadonlySet<string>,
): ReleaseStep {
  const { name, version, directory } = registered.publishable;
  return {
    name,
    version,
    directory,
    tag: tagOf(registered.publishable),
    action: actionFor(registered, existingTags),
  };
}

export async function planRelease(
  packages: readonly PublishablePackage[],
  registry: PackageRegistry,
  existingTags: ReadonlySet<string>,
): Promise<readonly ReleaseStep[]> {
  const registered = await Promise.all(
    inDependencyOrder(packages).map(
      async (publishable): Promise<RegisteredPackage> => ({
        publishable,
        record: await registry.record(publishable.name),
      }),
    ),
  );
  const unreserved = registered.filter(isUnreserved);
  if (unreserved.length > 0) {
    throw new UnreservedPackagesError(
      unreserved.map(({ publishable }) => publishable.name),
    );
  }
  return registered.map((entry) => stepFor(entry, existingTags));
}
