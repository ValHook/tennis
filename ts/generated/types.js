import { MAX_PER_MATCH_TYPE_PER_PLAYER_PAIR_OCCURENCE_DELTA } from "./constants.js";
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
    const cooldowns = [
        gauges.resting_cooldown,
        gauges.single_cooldown,
        gauges.double_cooldown,
        gauges.pairwise_single_cooldown,
        gauges.pairwise_double_cooldown,
    ];
    cooldowns.forEach(cooldown => {
        cooldown.forEach((v, k) => {
            cooldown.set(k, v - 1);
        });
    });
}
export function ValidateGauges(gauges, constraints) {
    const all_gauges = [
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
    const pairwise_gauges = [
        gauges.pairwise_single_max,
        gauges.pairwise_double_max,
    ];
    const all_constraints = [
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
    const max_and_cooldowns_ok = all_gauges
        .every((gauge, i) => [...gauge.values()].every(value => value <= all_constraints[i]));
    const diversity_ok = pairwise_gauges
        .map(gauge => [...gauge.values()])
        .every(values => {
        return Math.max(...values) <=
            Math.min(...values) + MAX_PER_MATCH_TYPE_PER_PLAYER_PAIR_OCCURENCE_DELTA;
    });
    return max_and_cooldowns_ok && diversity_ok;
}
//# sourceMappingURL=types.js.map