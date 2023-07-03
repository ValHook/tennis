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
  StageRoster,
  Constraints,
} from "./types";
import {
  ConstraintsForRelaxingsCount,
  MAX_ATTEMPTS_TO_MAKE_ROTATION_PROPOSALS,
  MAX_CONSTRAINT_RELAXINGS,
  MAX_SUBOPTIMAL_ROTATION_PROPOSAL_ALTERNATIVES_PER_NODE,
  MAX_ROTATION_PROPOSALS_PER_NODE,
  MAX_SIMULATION_TIME_SECONDS,
  NChooseK,
  NUM_PLAYERS_DOUBLE,
  NUM_PLAYERS_SINGLE,
} from "./constants";
import { StatusOr } from "./status";
import { Rng, PopRandomElement, Mulberry32 } from "./rng";

export function SessionFromInput(input: Input): Session {
  const courts = [...input.courts];
  const match_duration_minutes = input.match_duration;
  const n_courts = input.courts.length;
  courts.sort((a, b) => a.availability_minutes - b.availability_minutes);

  const players = [...input.players];
  const allowed_durations = new Set(courts.map((c) => c.availability_minutes));
  const n_players = input.players.length;
  players.sort((a, b) => a.availability_minutes - b.availability_minutes);

  const stages: Stage[] = [];
  const stage_durations = Array.from(allowed_durations)
    .sort((a, b) => a - b)
    .map((duration, i, durations) => (i == 0 ? duration : duration - durations[i - 1]));
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
      n_players - players.findIndex((p) => p.availability_minutes >= end_minutes);
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
      n_single_players: 0,
      n_double_players: 0,
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
    stage.n_single_players = stage.n_single_courts * NUM_PLAYERS_SINGLE;
    stage.n_double_players = stage.n_double_courts * NUM_PLAYERS_DOUBLE;
    stages.push(stage);
    start_minutes += duration;
  }

  return { courts, players, stages };
}

export function ComputeRosters(session: Session, seed: number): StageRoster[] {
  const deadline = Date.now() + 1000 * MAX_SIMULATION_TIME_SECONDS;
  const rng = Mulberry32(seed);
  const rosters: StageRoster[] = [];
  for (let i = 0; i < session.stages.length; ++i) {
    const stage = session.stages[i];
    const checker = new ConstraintsChecker(stage);
    const stage_roster = ComputeStageRoster(session, i, 0, checker, deadline, rng);
    rosters.push(stage_roster);
  }
  return rosters;
}

function ComputeStageRoster(
  session: Session,
  stage_id: number,
  rotation_id: number,
  checker: ConstraintsChecker,
  deadline: number,
  rng: Rng
): StageRoster {
  if (rotation_id >= session.stages[stage_id].n_rotations) {
    return {
      rotations: StatusOr.Ok([]),
      stage_id: stage_id,
      deepest_rotation_reached: rotation_id,
      constraints: checker.constraints,
      relaxings_count: checker.relaxings_count,
    };
  }

  checker.strictenConstraintsIfPossible();
  const optimal_relaxings = checker.relaxings_count;
  let deepest_failure: StageRoster = {
    rotations: StatusOr.Error("Couldn't make further proposals."),
    stage_id: stage_id,
    deepest_rotation_reached: rotation_id,
    constraints: checker.constraints,
    relaxings_count: checker.relaxings_count,
  };
  let best_success: StageRoster | undefined = undefined;
  let successes = 0;

  const proposals = MakeRotationProposals(session, stage_id, checker, deadline, rng);
  for (
    let proposal = proposals.next();
    !proposal.done &&
    best_success?.relaxings_count !== optimal_relaxings &&
    successes < MAX_SUBOPTIMAL_ROTATION_PROPOSAL_ALTERNATIVES_PER_NODE;
    proposal = proposals.next()
  ) {
    const roster = ComputeStageRoster(
      session,
      stage_id,
      rotation_id + 1,
      proposal.value.downstream_checker,
      deadline,
      rng
    );
    if (roster.rotations.ok()) {
      ++successes;
      if (!best_success || roster.relaxings_count < best_success!.relaxings_count) {
        best_success = {
          rotations: StatusOr.Ok([proposal.value.rotation].concat(roster.rotations.value())),
          stage_id: roster.stage_id,
          deepest_rotation_reached: roster.deepest_rotation_reached,
          constraints: roster.constraints,
          relaxings_count: roster.relaxings_count,
        };
      }
    } else {
      if (
        !deepest_failure ||
        roster.deepest_rotation_reached > deepest_failure.deepest_rotation_reached ||
        (roster.deepest_rotation_reached == deepest_failure.deepest_rotation_reached &&
          roster.relaxings_count > deepest_failure.relaxings_count)
      ) {
        deepest_failure = roster;
      }
    }
  }

  return (best_success || deepest_failure)!;
}

function* MakeRotationProposals(
  session: Session,
  stage_id: number,
  checker: ConstraintsChecker,
  deadline: number,
  rng: Rng
) {
  const stage = session.stages[stage_id];
  const proposals_count = 0;
  for (
    let i = 0, can_relax = true;
    can_relax && Date.now() < deadline && proposals_count < MAX_ROTATION_PROPOSALS_PER_NODE;
    ++i
  ) {
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
    const downstream_checker = checker.copy();
    for (const resting_player of rotation.resting_players) {
      downstream_checker.add(Happening.Resting(resting_player));
    }
    for (const single of rotation.singles) {
      downstream_checker.add(Happening.PlayingSingle(single.player_a));
      downstream_checker.add(Happening.PlayingSingle(single.player_b));
      downstream_checker.add(Happening.PlayingSingleAgainst(single.player_a, single.player_b));
    }
    for (const double of rotation.doubles) {
      downstream_checker.add(Happening.PlayingDouble(double.player_a1));
      downstream_checker.add(Happening.PlayingDouble(double.player_a2));
      downstream_checker.add(Happening.PlayingDouble(double.player_b1));
      downstream_checker.add(Happening.PlayingDouble(double.player_b2));
      downstream_checker.add(Happening.PlayingDoubleAgainst(double.player_a1, double.player_b1));
      downstream_checker.add(Happening.PlayingDoubleAgainst(double.player_a1, double.player_b2));
      downstream_checker.add(Happening.PlayingDoubleAgainst(double.player_a2, double.player_b1));
      downstream_checker.add(Happening.PlayingDoubleAgainst(double.player_a2, double.player_b2));
      downstream_checker.add(Happening.PlayingDoubleWith(double.player_a1, double.player_a2));
      downstream_checker.add(Happening.PlayingDoubleWith(double.player_b1, double.player_b2));
    }
    if (downstream_checker.validateAndAdvanceToNextRotation()) {
      yield {
        rotation,
        downstream_checker,
      };
    } else if (
      i % Math.floor(MAX_ATTEMPTS_TO_MAKE_ROTATION_PROPOSALS / MAX_CONSTRAINT_RELAXINGS) ==
      0
    ) {
      can_relax = checker.relaxConstraintsIfPossible();
    }
  }
}

export class ConstraintsChecker {
  constructor(stage: Stage) {
    this.stage = stage;
    this.rotation_id = 0;
    this.relaxings_count = 0;
    const n_player_pairs = NChooseK(stage.n_players, 2);
    this.permutations = {
      [HappeningType.RESTING]: stage.n_players,
      [HappeningType.PLAYING_SINGLE]: stage.n_players,
      [HappeningType.PLAYING_SINGLE_AGAINST]: n_player_pairs,
      [HappeningType.PLAYING_DOUBLE]: stage.n_players,
      [HappeningType.PLAYING_DOUBLE_AGAINST]: n_player_pairs,
      [HappeningType.PLAYING_DOUBLE_WITH]: n_player_pairs,
    };
    this.happenings = {
      [HappeningType.RESTING]: {},
      [HappeningType.PLAYING_SINGLE]: {},
      [HappeningType.PLAYING_SINGLE_AGAINST]: {},
      [HappeningType.PLAYING_DOUBLE]: {},
      [HappeningType.PLAYING_DOUBLE_AGAINST]: {},
      [HappeningType.PLAYING_DOUBLE_WITH]: {},
    };
    this.insertion_rotations = {};
    this.constraints = ConstraintsForRelaxingsCount(this.relaxings_count, this.stage);
  }

  copy() {
    const out = new ConstraintsChecker(this.stage);
    out.rotation_id = this.rotation_id;
    out.relaxings_count = this.relaxings_count;
    out.happenings = this.recordCopy(this.happenings);
    out.insertion_rotations = this.recordCopy(this.insertion_rotations);
    out.constraints = this.constraints; // constraints are immutable, no deep copy required.
    return out;
  }

  add(happening: Happening) {
    const serialized = JSON.stringify(happening);
    // Add happening.
    if (!this.happenings[happening.type][serialized]) {
      this.happenings[happening.type][serialized] = 0;
    }
    ++this.happenings[happening.type][serialized];
    // Add insertion rotation.
    if (!this.insertion_rotations[serialized]) {
      this.insertion_rotations[serialized] = [];
    }
    this.insertion_rotations[serialized].push(this.rotation_id);
  }

  validateAndAdvanceToNextRotation() {
    // Validate cooldowns.
    for (const [happening, insertions] of Object.entries(this.insertion_rotations)) {
      if (insertions.length < 2) {
        continue;
      }
      const type = (JSON.parse(happening) as Happening).type;
      const observed_cooldown =
        insertions[insertions.length - 1] - insertions[insertions.length - 2] - 1;
      const min_cooldown = this.constraints.min_cooldowns[type];
      if (observed_cooldown < min_cooldown) {
        return false;
      }
    }
    // Validate spreads.
    for (const [type, record] of Object.entries(this.happenings)) {
      const casted_type = type as unknown as HappeningType;
      const min =
        Object.keys(record).length < this.permutations[casted_type]
          ? 0
          : Math.min(...Object.values(record));
      const max = Math.max(...Object.values(record));
      const observed_spread = max - min;
      const max_spread = this.constraints.max_spreads[casted_type];
      if (observed_spread > max_spread) {
        return false;
      }
    }
    ++this.rotation_id;
    return true;
  }

  relaxConstraintsIfPossible() {
    if (this.relaxings_count == MAX_CONSTRAINT_RELAXINGS) {
      return false;
    }
    ++this.relaxings_count;
    this.constraints = ConstraintsForRelaxingsCount(this.relaxings_count, this.stage);
    return true;
  }

  strictenConstraintsIfPossible() {
    if (this.relaxings_count == 0) {
      return false;
    }
    --this.relaxings_count;
    this.constraints = ConstraintsForRelaxingsCount(this.relaxings_count, this.stage);
  }

  protected recordCopy<K extends string | number | symbol, V>(record: Record<K, V>) {
    return JSON.parse(JSON.stringify(record));
  }
  protected stage: Stage;
  protected rotation_id: number;
  public relaxings_count: number;
  protected permutations: { [key in HappeningType]: number };
  protected happenings: { [key in HappeningType]: Record<string, number> };
  protected insertion_rotations: Record<string, number[]>;
  public constraints: Constraints;
}
