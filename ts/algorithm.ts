import {
  Court,
  Player,
  Stage,
  Session,
  Rotation,
  MatchSingle,
  MatchDouble,
  Input,
  HappeningType,
  Happening,
  Roster,
} from "./types";
import {
  MAX_DELTAS_PER_HAPPENING_TYPE,
  MAX_SIMULATIONS_PER_NODE,
  NUM_PLAYERS_DOUBLE,
  NUM_PLAYERS_SINGLE,
} from "./constants";
import { Status, StatusOr } from "./status";
import { Rng, PopRandomElement, Mulberry32 } from "./rng";

export function SessionFromInput(input: Input): Session {
  const courts: Court[] = [];
  const match_duration_minutes = input.match_duration;
  const n_courts = input.court_availabilities.length;
  for (let i = 0; i < n_courts; ++i) {
    courts.push({
      id: i,
      availability_minutes: input.court_availabilities[i],
    });
  }
  courts.sort((a, b) => a.availability_minutes - b.availability_minutes);
  courts.forEach((c, i) => (c.id = i));

  const players: Player[] = [];
  const allowed_durations = new Set(courts.map((c) => c.availability_minutes));
  const n_players = input.player_names.length;
  for (let i = 0; i < n_players; ++i) {
    const player = {
      name: input.player_names[i],
      availability_minutes: input.player_availabilties[i],
    };
    players.push(player);
  }
  players.sort((a, b) => a.availability_minutes - b.availability_minutes);

  const stages: Stage[] = [];
  const stage_durations = Array.from(allowed_durations)
    .sort((a, b) => a - b)
    .map((duration, i, durations) =>
      i == 0 ? duration : duration - durations[i - 1]
    );
  let start_minutes = 0;
  for (let i = 0; i < stage_durations.length; ++i) {
    const duration = stage_durations[i];
    const end_minutes = start_minutes + duration;
    let remaining_courts =
      n_courts - courts.findIndex((c) => c.availability_minutes >= end_minutes);
    if (remaining_courts > n_courts) {
      remaining_courts = 0;
    }
    let remaining_players =
      n_players -
      players.findIndex((p) => p.availability_minutes >= end_minutes);
    if (remaining_players > n_players) {
      remaining_players = 0;
    }
    const n_rotations = Math.floor(duration / match_duration_minutes);
    const stage: Stage = {
      id: i,
      start_minutes,
      end_minutes,
      n_rotations,
      n_matches: n_rotations * remaining_courts,
      n_players: remaining_players,
      n_courts: remaining_courts,
      n_single_courts: 0,
      n_double_courts: 0,
      n_resting_players_per_rotation: 0,
      n_active_players: 0,
    };
    for (; remaining_courts > 0; --remaining_courts) {
      if (remaining_courts * NUM_PLAYERS_DOUBLE > remaining_players) {
        stage.n_single_courts += 1;
        remaining_players -= NUM_PLAYERS_SINGLE;
      } else {
        stage.n_double_courts += 1;
        remaining_players -= NUM_PLAYERS_DOUBLE;
      }
    }
    stage.n_resting_players_per_rotation = remaining_players;
    stage.n_active_players = stage.n_players - remaining_players;
    stages.push(stage);
    start_minutes += duration;
  }

  return { courts, players, stages };
}

export function ComputeRoster(session: Session, seed: number): Roster {
  const rng = Mulberry32(seed);
  const rotations: Rotation[][] = [];
  for (let i = 0; i < session.stages.length; ++i) {
    const stage = session.stages[i];
    const checker = new HappeningDeltaChecker(stage.n_players);
    const stage_rotations = ComputeStageRotations(session, i, 0, checker, rng);
    if (!stage_rotations.ok()) {
      return {
        rotations: StatusOr.Error<Rotation[][]>(
          "Problematic stage: " +
            i +
            ". Most common error: " +
            stage_rotations.error()
        ),
      };
    }
    rotations.push(stage_rotations.value());
  }
  return {
    rotations: StatusOr.Ok(rotations),
  };
}

function ComputeStageRotations(
  session: Session,
  stage_id: number,
  rotation_id: number,
  checker: HappeningDeltaChecker,
  rng: Rng
): StatusOr<Rotation[]> {
  const stage = session.stages[stage_id];
  if (rotation_id >= stage.n_rotations) {
    return StatusOr.Ok([]);
  }
  const rejections: Record<string, number> = {};
  const downstream_rejections: Record<string, number> = {};
  for (let i = 0; i < MAX_SIMULATIONS_PER_NODE; ++i) {
    // Generate rotation proposal.
    const active_players = session.players
      .slice(session.players.length - stage.n_players)
      .sort(() => 0.5 - rng());
    const resting_players = Array(stage.n_resting_players_per_rotation)
      .fill(undefined)
      .map((_) => PopRandomElement(active_players, rng).name);
    const singles: MatchSingle[] = Array(stage.n_single_courts)
      .fill(undefined)
      .map((_) => {
        return {
          player_a: PopRandomElement(active_players, rng).name,
          player_b: PopRandomElement(active_players, rng).name,
        };
      });
    const doubles: MatchDouble[] = Array(stage.n_double_courts)
      .fill(undefined)
      .map((_) => {
        return {
          player_a1: PopRandomElement(active_players, rng).name,
          player_a2: PopRandomElement(active_players, rng).name,
          player_b1: PopRandomElement(active_players, rng).name,
          player_b2: PopRandomElement(active_players, rng).name,
        };
      });
    const rotation: Rotation = {
      resting_players,
      singles,
      doubles,
    };
    // Check constraints.
    const checker_with_proposal = checker.copy();
    for (const resting_player of rotation.resting_players) {
      checker_with_proposal.add(Happening.Resting(resting_player));
    }
    for (const single of rotation.singles) {
      checker_with_proposal.add(Happening.PlayingSingle(single.player_a));
      checker_with_proposal.add(Happening.PlayingSingle(single.player_b));
      checker_with_proposal.add(
        Happening.PlayingSingleAgainst(single.player_a, single.player_b)
      );
    }
    for (const double of rotation.doubles) {
      checker_with_proposal.add(Happening.PlayingDouble(double.player_a1));
      checker_with_proposal.add(Happening.PlayingDouble(double.player_a2));
      checker_with_proposal.add(Happening.PlayingDouble(double.player_b1));
      checker_with_proposal.add(Happening.PlayingDouble(double.player_b2));
      checker_with_proposal.add(
        Happening.PlayingDoubleAgainst(double.player_a1, double.player_b1)
      );
      checker_with_proposal.add(
        Happening.PlayingDoubleAgainst(double.player_a1, double.player_b2)
      );
      checker_with_proposal.add(
        Happening.PlayingDoubleAgainst(double.player_a2, double.player_b1)
      );
      checker_with_proposal.add(
        Happening.PlayingDoubleAgainst(double.player_a2, double.player_b2)
      );
      checker_with_proposal.add(
        Happening.PlayingDoubleWith(double.player_a1, double.player_a2)
      );
      checker_with_proposal.add(
        Happening.PlayingDoubleWith(double.player_b1, double.player_b2)
      );
    }
    const validation = checker_with_proposal.validate();
    if (!validation.ok()) {
      rejections[validation.error()] =
        (rejections[validation.error()] || 0) + 1;
      continue;
    }
    // Recurse.
    const next_rotations = ComputeStageRotations(
      session,
      stage_id,
      rotation_id + 1,
      checker_with_proposal,
      rng
    );
    if (!next_rotations.ok()) {
      downstream_rejections[next_rotations.error()] =
        (downstream_rejections[next_rotations.error()] || 0) + 1;
      continue;
    }
    return StatusOr.Ok([rotation].concat(next_rotations.value()));
  }
  // Report rejections upstream if needed.
  const could_advance_downstream =
    Object.keys(downstream_rejections).length > 0;
  const most_representative_rejection_pool = could_advance_downstream
    ? downstream_rejections
    : rejections;
  const most_representative_rejection = Object.entries(
    most_representative_rejection_pool
  ).reduce((best, next) => {
    if (!best) {
      return next;
    }
    return next[1] > best[1] ? next : best;
  });
  return StatusOr.Error<Rotation[]>(
    could_advance_downstream
      ? most_representative_rejection[0]
      : [
          most_representative_rejection[0],
          most_representative_rejection[1],
          "times",
          "at rotation:",
          rotation_id,
        ].join(" ")
  );
}

export class HappeningDeltaChecker {
  constructor(n_players: number) {
    this.happenings = {
      [HappeningType.RESTING]: {},
      [HappeningType.PLAYING_SINGLE]: {},
      [HappeningType.PLAYING_SINGLE_AGAINST]: {},
      [HappeningType.PLAYING_DOUBLE]: {},
      [HappeningType.PLAYING_DOUBLE_AGAINST]: {},
      [HappeningType.PLAYING_DOUBLE_WITH]: {},
    };
    const n_player_pairs = this.nChooseK(n_players, 2);
    this.permutations = {
      [HappeningType.RESTING]: n_players,
      [HappeningType.PLAYING_SINGLE]: n_players,
      [HappeningType.PLAYING_SINGLE_AGAINST]: n_player_pairs,
      [HappeningType.PLAYING_DOUBLE]: n_players,
      [HappeningType.PLAYING_DOUBLE_AGAINST]: n_player_pairs,
      [HappeningType.PLAYING_DOUBLE_WITH]: n_player_pairs,
    };
    this.n_players = n_players;
  }
  copy() {
    const out = new HappeningDeltaChecker(this.n_players);
    Object.keys(this.happenings).forEach((type) => {
      const casted_type = type as unknown as HappeningType;
      out.happenings[casted_type] = this.recordCopy(
        this.happenings[casted_type]
      );
    });
    return out;
  }

  add(happening: Happening) {
    const serialized = JSON.stringify(happening);
    const happening_type_map = this.happenings[happening.type];
    const prev_counter = happening_type_map[serialized] || 0;
    happening_type_map[serialized] = prev_counter + 1;
  }

  validate() {
    for (const [type, record] of Object.entries(this.happenings)) {
      const casted_type = type as unknown as HappeningType;
      const min =
        Object.keys(record).length < this.permutations[casted_type]
          ? 0
          : Math.min(...Object.values(record));
      const max = Math.max(...Object.values(record));
      const delta = max - min;
      if (delta > MAX_DELTAS_PER_HAPPENING_TYPE[casted_type]) {
        return Status.Error(
          "(type=" +
            casted_type +
            ", max_delta=" +
            MAX_DELTAS_PER_HAPPENING_TYPE[casted_type] +
            ", observed_delta=" +
            delta +
            ")"
        );
      }
    }
    this.log();
    return Status.Ok();
  }

  protected log() {
    console.log("HappeningDeltaChecker");
    console.log("Players: " + this.n_players);
    console.log("Permutations");
    for (const [type, value] of Object.entries(this.permutations)) {
      const casted_type = type as unknown as HappeningType;
      console.log(casted_type + ": " + value);
    }
    console.log("Happenings");
    for (const [type, map] of Object.entries(this.happenings)) {
      const casted_type = type as unknown as HappeningType;
      console.log(casted_type);
      console.log(Object.entries(map));
    }
    console.log("");
  }

  protected nChooseK(n: number, k: number) {
    return this.factorial(n) / this.factorial(k) / this.factorial(n - k);
  }

  protected factorial(x: number): number {
    return x > 1 ? x * this.factorial(x - 1) : 1;
  }

  protected recordCopy<K extends string | number | symbol, V>(
    record: Record<K, V>
  ) {
    return JSON.parse(JSON.stringify(record));
  }
  protected happenings: { [key in HappeningType]: Record<string, number> };
  protected permutations: { [key in HappeningType]: number };
  protected n_players: number;
}
