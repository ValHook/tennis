import { StatusOr } from "./status.js";
export function NChooseK(n, k) {
    return Factorial(n) / Factorial(k) / Factorial(n - k);
}
export function Factorial(x) {
    return x > 1 ? x * Factorial(x - 1) : 1;
}
export function Quantile(distribution, quantile) {
    if (distribution.length == 0) {
        return StatusOr.Error("No distribution.");
    }
    if (quantile < 0 || quantile > 1) {
        throw StatusOr.Error("Quantile must be within [0;1]");
    }
    const sorted = [...distribution].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * quantile;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
        return StatusOr.Ok(sorted[base] + rest * (sorted[base + 1] - sorted[base]));
    }
    else {
        return StatusOr.Ok(sorted[base]);
    }
}
export function Round(x, precision) {
    const y = Math.pow(10, precision);
    return Math.round(x * y) / y;
}
//# sourceMappingURL=math.js.map