import { MAX_PER_MATCH_TYPE_PER_PLAYER_PAIR_OCCURENCE_DELTA } from "./constants";
import { StatusOr } from "./status";

export interface Court {
  id: number;
  availability_minutes: number;
}

export interface Player {
  name: string;
  availability_minutes: number;
}

export interface Stage {
  id: number;
  start_minutes: number;
  end_minutes: number;
  n_rotations: number;
  n_matches: number;
  n_players: number;
  n_courts: number;
  n_single_courts: number;
  n_double_courts: number;
  n_resting_players_per_rotation: number;
}

export interface Session {
  courts: Court[];
  players: Player[];
  stages: Stage[];
}

export interface MatchSingle {
  player_a: string;
  player_b: string;
}

export interface MatchDouble {
  player_a1: string;
  player_a2: string;
  player_b1: string;
  player_b2: string;
}

export interface Rotation {
  resting_players: string[];
  singles: MatchSingle[];
  doubles: MatchDouble[];
}

export interface Fixtures {
  rotations: Rotation[];
}

export interface Roster {
  fixtures: StatusOr<Fixtures>[];
}

export interface Constraints {
  resting_max: number;
  single_max: number;
  double_max: number;
  pairwise_single_max: number;
  pairwise_double_max: number;
  resting_cooldown: number;
  single_cooldown: number;
  double_cooldown: number;
  pairwise_single_cooldown: number;
  pairwise_double_cooldown: number;
}

export type PairwiseKey = string;
export interface ConstraintGauges {
  resting_max: Map<string, number>;
  single_max: Map<string, number>;
  double_max: Map<string, number>;
  pairwise_single_max: Map<PairwiseKey, number>;
  pairwise_double_max: Map<PairwiseKey, number>;
  resting_cooldown: Map<string, number>;
  single_cooldown: Map<string, number>;
  double_cooldown: Map<string, number>;
  pairwise_single_cooldown: Map<PairwiseKey, number>;
  pairwise_double_cooldown: Map<PairwiseKey, number>;
}

export function PairwiseKeyFromNames(a: string, b: string): PairwiseKey {
  return [a, b].sort().join(", ");
}

export function CopyGauges(gauges: ConstraintGauges): ConstraintGauges {
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

export function ClockDownCooldowns(
  gauges: ConstraintGauges,
  constraints: Constraints
) {
  const cooldowns = [
    gauges.resting_cooldown,
    gauges.single_cooldown,
    gauges.double_cooldown,
    gauges.pairwise_single_cooldown,
    gauges.pairwise_double_cooldown,
  ];
  cooldowns.forEach((cooldown) => {
    cooldown.forEach((v, k) => {
      cooldown.set(k, v - 1);
    });
  });
}

export function ValidateGauges(
  gauges: ConstraintGauges,
  constraints: Constraints
) {
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
  const max_and_cooldowns_ok = all_gauges.every((gauge, i) =>
    [...gauge.values()].every((value) => value <= all_constraints[i])
  );
  const diversity_ok = pairwise_gauges
    .map((gauge) => [...gauge.values()])
    .every((values) => {
      return (
        Math.max(...values) <=
        Math.min(...values) + MAX_PER_MATCH_TYPE_PER_PLAYER_PAIR_OCCURENCE_DELTA
      );
    });
  return max_and_cooldowns_ok && diversity_ok;
}
