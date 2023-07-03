import { Constraints, HappeningType, Stage } from "./types";

export const NUM_PLAYERS_SINGLE = 2;
export const NUM_PLAYERS_DOUBLE = 4;
export const MAX_COURTS = 4;
export const MAX_PLAYERS = 12;
export const MAX_SIMULATION_TIME_SECONDS = 30;
export const MAX_CONSTRAINT_RELAXINGS = 4;
export const MAX_ATTEMPTS_TO_MAKE_ROTATION_PROPOSALS = 15000;
export const MAX_ROTATION_PROPOSALS_PER_NODE = 15000;
export const MAX_SUBOPTIMAL_ROTATION_PROPOSAL_ALTERNATIVES_PER_NODE = 1;

export function ConstraintsForRelaxingsCount(relaxings_count: number, stage: Stage): Constraints {
  let double_with_spread = 1;
  let double_against_spread = 1;
  let double_against_cooldown = stage.n_players > 4 ? 2 : 0;

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

  const max_spreads = {
    [HappeningType.RESTING]: 1,
    [HappeningType.PLAYING_SINGLE]: 1,
    [HappeningType.PLAYING_SINGLE_AGAINST]: 1,
    [HappeningType.PLAYING_DOUBLE]: 1,
    [HappeningType.PLAYING_DOUBLE_AGAINST]: double_against_spread,
    [HappeningType.PLAYING_DOUBLE_WITH]: double_with_spread,
  };

  const resting_probability = stage.n_resting_players_per_rotation / stage.n_players;
  const single_probability = stage.n_single_players / stage.n_players;
  const double_probability = stage.n_double_players / stage.n_players;
  const single_against_probability =
    Math.pow(single_probability, 2) / NChooseK(stage.n_single_players - 1, 1);
  const double_with_probability =
    Math.pow(double_probability, 2) / NChooseK(stage.n_double_players - 1, 1);

  const min_cooldowns = {
    [HappeningType.RESTING]: CooldownForProbability(resting_probability),
    [HappeningType.PLAYING_SINGLE]: CooldownForProbability(single_probability),
    [HappeningType.PLAYING_SINGLE_AGAINST]: CooldownForProbability(single_against_probability),
    [HappeningType.PLAYING_DOUBLE]: CooldownForProbability(double_probability),
    [HappeningType.PLAYING_DOUBLE_AGAINST]: double_against_cooldown,
    [HappeningType.PLAYING_DOUBLE_WITH]: CooldownForProbability(double_with_probability),
  };

  return {
    max_spreads,
    min_cooldowns,
  };
}

export function CooldownForProbability(p: number) {
  return Math.floor((1 - p) / p);
}

export function NChooseK(n: number, k: number) {
  return Factorial(n) / Factorial(k) / Factorial(n - k);
}

export function Factorial(x: number): number {
  return x > 1 ? x * Factorial(x - 1) : 1;
}
