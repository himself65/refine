export function assertExists<T> (
  value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'value is null or undefined')
  }
}
