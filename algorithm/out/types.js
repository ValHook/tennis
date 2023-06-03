export function PairwiseKeyFromNames(a, b) {
    return [a, b].sort().join(", ");
}
export function CopyGauges(gauges) {
    return {
        resting_max: new Map(gauges.resting_max),
        single_max: new Map(gauges.single_max),
        double_max: new Map(gauges.double_max),
        pairwise_single_max: new Map(gauges.pairwise_single_max),
        pairwise_double_max: new Map(gauges.pairwise_double_max),
        resting_cooldown: new Map(gauges.resting_cooldown),
        single_cooldown: new Map(gauges.single_cooldown),
        double_cooldown: new Map(gauges.double_cooldown),
        pairwise_single_cooldown: new Map(gauges.pairwise_single_cooldown),
        pairwise_double_cooldown: new Map(gauges.pairwise_double_cooldown),
    };
}
export function ClockDownCooldowns(gauges, constraints) {
    const maps = [
        gauges.resting_cooldown,
        gauges.single_cooldown,
        gauges.double_cooldown,
        gauges.pairwise_single_cooldown,
        gauges.pairwise_double_cooldown,
    ];
    maps.forEach(map => {
        map.forEach((v, k) => {
            map.set(k, v - 1);
        });
    });
}
export function ValidateGauges(gauges, constraints) {
    const maps = [
        gauges.resting_max,
        gauges.single_max,
        gauges.double_max,
        gauges.pairwise_single_max,
        gauges.pairwise_double_max,
        gauges.resting_cooldown,
        gauges.single_cooldown,
        gauges.double_cooldown,
        gauges.pairwise_single_cooldown,
        gauges.pairwise_double_cooldown,
    ];
    const maxes = [
        constraints.resting_max,
        constraints.single_max,
        constraints.double_max,
        constraints.pairwise_single_max,
        constraints.pairwise_double_max,
        constraints.resting_cooldown,
        constraints.single_cooldown,
        constraints.double_cooldown,
        constraints.pairwise_single_cooldown,
        constraints.pairwise_double_cooldown,
    ];
    const pairwise_maxes = [
        gauges.pairwise_single_max,
        gauges.pairwise_double_max,
    ].map(map => [...map.values()]);
    console.log(pairwise_maxes);
    const max_and_cooldowns_ok = maps.every((map, i) => [...map.values()].every(v => v <= maxes[i]));
    const diversity_ok = pairwise_maxes.every(maxes => Math.max(...maxes) < Math.min(...maxes) + 2);
    return max_and_cooldowns_ok && diversity_ok;
}
