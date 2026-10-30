export interface AllowlistDefinition {
  readonly validator: string;
  readonly allowlist?: readonly string[];
}

export function allowlistFor(
  validatorName: string,
  definitions: readonly AllowlistDefinition[],
): ReadonlySet<string> {
  return new Set(
    definitions
      .filter((definition) => definition.validator === validatorName)
      .flatMap((definition) => definition.allowlist ?? []),
  );
}
