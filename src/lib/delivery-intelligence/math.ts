export function roundHalfUp(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return (Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * factor)) / factor;
}

export function populationStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

export function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}
