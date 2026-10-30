import type { Finding } from '../engine/detect.js';

export interface MaskingStrategy {
  mask(finding: Finding, value: string): string;
}
