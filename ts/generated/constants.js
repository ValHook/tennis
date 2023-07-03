import { HappeningType } from "./types.js";
export const NUM_PLAYERS_SINGLE = 2;
export const NUM_PLAYERS_DOUBLE = 4;
export const MAX_COURTS = 4;
export const MAX_PLAYERS = 12;
export const MAX_SIMULATION_TIME_SECONDS = 30;
export const MAX_CONSTRAINT_RELAXINGS = 5;
export const MAX_ATTEMPTS_TO_MAKE_ROTATION_PROPOSALS = 15000;
export const MAX_ROTATION_PROPOSALS_PER_NODE = 15000;
export const MAX_SUBOPTIMAL_ROTATION_PROPOSAL_ALTERNATIVES_PER_NODE = 1;
export function ConstraintsForRelaxingsCount(relaxings_count, stage) {
    // Invariant parameters.
    const preferred_max_spread = 1;
    const preferred_double_against_min_cooldown = 2;
    const resting_probability = stage.n_resting_players_per_rotation / stage.n_players;
    const single_probability = stage.n_single_players / stage.n_players;
    const double_probability = stage.n_double_players / stage.n_players;
    const single_against_probability = Math.pow(single_probability, 2) / NChooseK(stage.n_single_players - 1, 1);
    const double_with_probability = Math.pow(double_probability, 2) / NChooseK(stage.n_double_players - 1, 1);
    // Relaxable parameters.
    let single_cooldown = CooldownForProbability(single_probability);
    let double_cooldown = CooldownForProbability(double_probability);
    let double_with_spread = preferred_max_spread;
    let double_against_spread = preferred_max_spread;
    let double_against_cooldown = stage.n_players > 4 ? preferred_double_against_min_cooldown : 0;
    if (relaxings_count-- > 0) {
        single_cooldown = 0;
        double_against_cooldown = 0;
    }
    if (relaxings_count-- > 0) {
        ++double_against_spread;
    }
    if (relaxings_count-- > 0) {
        double_against_cooldown = Math.floor(double_against_cooldown / 2);
    }
    if (relaxings_count-- > 0) {
        ++double_against_spread;
    }
    if (relaxings_count-- > 0) {
        double_against_cooldown = Math.floor(double_against_cooldown / 2);
    }
    if (relaxings_count > 0) {
        throw new Error("Unimplemented relaxing logic");
    }
    // Output.
    const max_spreads = {
        [HappeningType.RESTING]: preferred_max_spread,
        [HappeningType.PLAYING_SINGLE]: preferred_max_spread,
        [HappeningType.PLAYING_SINGLE_AGAINST]: preferred_max_spread,
        [HappeningType.PLAYING_DOUBLE]: preferred_max_spread,
        [HappeningType.PLAYING_DOUBLE_AGAINST]: double_against_spread,
        [HappeningType.PLAYING_DOUBLE_WITH]: double_with_spread,
    };
    const min_cooldowns = {
        [HappeningType.RESTING]: CooldownForProbability(resting_probability),
        [HappeningType.PLAYING_SINGLE]: single_cooldown,
        [HappeningType.PLAYING_SINGLE_AGAINST]: CooldownForProbability(single_against_probability),
        [HappeningType.PLAYING_DOUBLE]: double_cooldown,
        [HappeningType.PLAYING_DOUBLE_AGAINST]: double_against_cooldown,
        [HappeningType.PLAYING_DOUBLE_WITH]: CooldownForProbability(double_with_probability),
    };
    return {
        max_spreads,
        min_cooldowns,
    };
}
export function CooldownForProbability(p) {
    return Math.floor((1 - p) / p);
}
export function NChooseK(n, k) {
    return Factorial(n) / Factorial(k) / Factorial(n - k);
}
export function Factorial(x) {
    return x > 1 ? x * Factorial(x - 1) : 1;
}
//# sourceMappingURL=constants.js.map