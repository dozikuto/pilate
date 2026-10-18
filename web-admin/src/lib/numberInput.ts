export function normalizeNumberInput(value: string): string {
  return value.replace(/^(-?)0+(?=\d)/, '$1')
}

export function parseNumberInput(value: string): number {
  return value.trim() === '' ? NaN : Number(value)
}
