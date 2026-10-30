import identifiers from '../catalogs/identifiers.json' with { type: 'json' };
import { InvalidConfigurationError } from '../errors.js';
import type { MaskingStrategy } from '../strategies/masking-strategy.js';
import {
  createDefaultValidatorRegistry,
  type ValidatorRegistry,
} from '../validators/validator-registry.js';
import { compileCandidatePatterns } from './candidates.js';
import type { Confidence, TypeDetector } from './detect.js';

const CONFIDENCES: ReadonlySet<string> = new Set(['high', 'medium', 'low']);

export interface IdentifierDefinition {
  readonly pattern: string;
  readonly validator: string;
  readonly confidence: string;
}

export interface EngineOptions {
  readonly types: readonly string[];
  readonly maxInputLength: number;
  readonly strategy: MaskingStrategy;
}

export interface Engine {
  readonly detectors: readonly TypeDetector[];
  readonly maxInputLength: number;
  readonly strategy: MaskingStrategy;
}

function isConfidence(value: string): value is Confidence {
  return CONFIDENCES.has(value);
}

function confidenceOf(definition: IdentifierDefinition): Confidence {
  if (!isConfidence(definition.confidence)) {
    throw new InvalidConfigurationError(
      `Unknown confidence: ${definition.confidence}`,
    );
  }
  return definition.confidence;
}

export function createEngine(
  options: EngineOptions,
  definitions: Readonly<Record<string, IdentifierDefinition>> = identifiers,
  registry: ValidatorRegistry = createDefaultValidatorRegistry(),
): Engine {
  const detectors = compileCandidatePatterns(definitions, options.types).map(
    ({ type, pattern }) => {
      const definition = definitions[type] as IdentifierDefinition;
      return {
        type,
        pattern,
        confidence: confidenceOf(definition),
        validator: registry.validatorFor(definition.validator),
      };
    },
  );
  return {
    detectors,
    maxInputLength: options.maxInputLength,
    strategy: options.strategy,
  };
}
