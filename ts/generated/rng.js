export function Mulberry32(seed) {
    return function () {
        var t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function PopRandomElement(arr, rng) {
    return arr.splice(Math.floor(rng() * arr.length), 1)[0];
}
//# sourceMappingURL=rng.js.map