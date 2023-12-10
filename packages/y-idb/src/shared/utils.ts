export function assertExists<T> (value: T | null | undefined, message?: string): T {
  if (value === null || value === undefined) {
    throw new Error(message || 'value is null or undefined')
  }
  return value
}
