interface DependentPackage {
  readonly name: string;
  readonly peerDependencies: readonly string[];
}

function byName(first: DependentPackage, second: DependentPackage): number {
  return first.name.localeCompare(second.name, 'en');
}

function isReady(
  candidate: DependentPackage,
  pending: readonly DependentPackage[],
): boolean {
  return !pending.some(
    (other) =>
      other !== candidate && candidate.peerDependencies.includes(other.name),
  );
}

function orderFrom<Package extends DependentPackage>(
  pending: readonly Package[],
): readonly Package[] {
  const chosen =
    pending.find((candidate) => isReady(candidate, pending)) ?? pending[0];
  if (chosen === undefined) {
    return [];
  }
  return [
    chosen,
    ...orderFrom(pending.filter((candidate) => candidate !== chosen)),
  ];
}

export function inDependencyOrder<Package extends DependentPackage>(
  packages: readonly Package[],
): readonly Package[] {
  return orderFrom([...packages].sort(byName));
}
