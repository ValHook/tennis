export type Rng = () => number;
export function Mulberry32(seed: number): Rng {
  return function () {
    var t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function PopRandomElement<T>(arr: T[], rng: Rng): T {
  return arr.splice(Math.floor(rng() * arr.length), 1)[0];
}
