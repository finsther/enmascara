/**
 * Thrown by {@link createRedactor} when an option is invalid. Its message
 * names the option, never a detected value.
 *
 * @example
 * ```ts
 * try {
 *   createRedactor({ detect: [] });
 * } catch (error) {
 *   if (error instanceof InvalidConfigurationError) {
 *     console.error(error.message);
 *   }
 * }
 * ```
 */
export class InvalidConfigurationError extends Error {
  override readonly name = 'InvalidConfigurationError';
}
