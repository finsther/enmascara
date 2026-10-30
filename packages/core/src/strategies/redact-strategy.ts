import type { MaskingStrategy } from './masking-strategy.js';

export const redactStrategy: MaskingStrategy = {
  mask: (finding) => `[${finding.type.toUpperCase()}]`,
};
