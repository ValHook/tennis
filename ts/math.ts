export function NChooseK(n: number, k: number) {
  return Factorial(n) / Factorial(k) / Factorial(n - k);
}

export function Factorial(x: number): number {
  return x > 1 ? x * Factorial(x - 1) : 1;
}

export function Quantile(distribution: number[], quantile: number) {
  if (quantile < 0 || quantile > 1) {
    throw new Error("Quantile must be within [0;1]");
  }
  const sorted = [...distribution].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * quantile;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

export function Round(x: number, precision: number) {
  const y = Math.pow(10, precision);
  return Math.round(x * y) / y;
}
