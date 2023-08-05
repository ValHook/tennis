import { HappeningType, Happening, } from "./types.js";
import { ConstraintsForRelaxingsCount, MAX_ATTEMPTS_TO_MAKE_ROTATION_PROPOSALS, MAX_CONSTRAINT_RELAXINGS, MAX_SUBOPTIMAL_ROTATION_PROPOSAL_ALTERNATIVES_PER_NODE, MAX_ROTATION_PROPOSALS_PER_NODE, MAX_SIMULATION_TIME_SECONDS, NUM_PLAYERS_DOUBLE, NUM_PLAYERS_SINGLE, } from "./constants.js";
import { StatusOr } from "./status.js";
import { PopRandomElement, Mulberry32 } from "./rng.js";
import { NChooseK, Quantile, Round } from "./math.js";
export function SessionFromInput(input) {
    const courts = [...input.courts];
    const match_duration_minutes = input.match_duration;
    const n_courts = input.courts.length;
    courts.sort((a, b) => a.availability_minutes - b.availability_minutes);
    const players = [...input.players];
    const allowed_durations = new Set(courts.map((c) => c.availability_minutes).concat(players.map((p) => p.availability_minutes)));
    const n_players = input.players.length;
    players.sort((a, b) => a.availability_minutes - b.availability_minutes);
    const stages = [];
    const stage_durations = Array.from(allowed_durations)
        .sort((a, b) => a - b)
        .map((duration, i, durations) => (i == 0 ? duration : duration - durations[i - 1]));
    let start_minutes = 0;
    for (let i = 0; i < stage_durations.length; ++i) {
        const duration = stage_durations[i];
        const end_minutes = start_minutes + duration;
        let remaining_courts = n_courts - courts.findIndex((c) => c.availability_minutes >= end_minutes);
        if (remaining_courts > n_courts) {
            remaining_courts = 0;
        }
        let remaining_players = n_players - players.findIndex((p) => p.availability_minutes >= end_minutes);
        if (remaining_players > n_players) {
            remaining_players = 0;
        }
        const n_rotations = Math.floor(duration / match_duration_minutes);
        const stage = {
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
            }
            else {
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
export function ComputeRosters(session, seed) {
    const deadline = Date.now() + 1000 * MAX_SIMULATION_TIME_SECONDS;
    const rng = Mulberry32(seed);
    const rosters = [];
    for (let i = 0; i < session.stages.length; ++i) {
        const stage = session.stages[i];
        const players = session.players.slice(session.players.length - stage.n_players);
        const root_checker = new ConstraintsChecker(stage, players);
        const roster = AddStatsOrErrorToRoster(ComputeStageRoster(root_checker, deadline, rng));
        rosters.push(roster);
    }
    return rosters;
}
function ComputeStageRoster(checker, deadline, rng) {
    if (checker.reachedEnd()) {
        return {
            rotations: StatusOr.Ok([]),
            checker: checker,
        };
    }
    checker.strictenConstraintsIfPossible();
    const optimal_relaxings = checker.relaxingsCount();
    const proposals = MakeRotationProposals(checker, deadline, rng);
    let deepest_failure = {
        rotations: StatusOr.Error("Couldn't build roster for this stage. Deepest rotation reached: " +
            checker.deepestRotationReached() +
            ". Relaxings attempted: " +
            checker.relaxingsCount()),
        checker: checker,
    };
    let best_success = undefined;
    let successes = 0;
    for (let proposal = proposals.next(); !proposal.done &&
        best_success?.checker.relaxingsCount() !== optimal_relaxings &&
        successes < MAX_SUBOPTIMAL_ROTATION_PROPOSAL_ALTERNATIVES_PER_NODE; proposal = proposals.next()) {
        const subroster = ComputeStageRoster(proposal.value.downstream_checker, deadline, rng);
        if (subroster.rotations.ok()) {
            ++successes;
            if (!best_success ||
                subroster.checker.relaxingsCount() < best_success.checker.relaxingsCount()) {
                best_success = {
                    rotations: StatusOr.Ok([proposal.value.rotation].concat(subroster.rotations.value())),
                    checker: subroster.checker,
                };
            }
        }
        else {
            const deepest_so_far = deepest_failure.checker.deepestRotationReached();
            const subroster_depth = subroster.checker.deepestRotationReached();
            const relax_count_so_far = deepest_failure.checker.relaxingsCount();
            const subroster_relax_count = subroster.checker.relaxingsCount();
            if (subroster_depth > deepest_so_far ||
                (subroster_depth == deepest_so_far && subroster_relax_count > relax_count_so_far)) {
                deepest_failure = subroster;
            }
        }
    }
    return (best_success || deepest_failure);
}
function* MakeRotationProposals(checker, deadline, rng) {
    const stage = checker.stage();
    const proposals_count = 0;
    for (let i = 0, can_relax = true; can_relax && Date.now() < deadline && proposals_count < MAX_ROTATION_PROPOSALS_PER_NODE; ++i) {
        // Generate rotation proposal.
        const active_players = [...checker.players()].sort(() => 0.5 - rng());
        const resting_players = Array(stage.n_resting_players_per_rotation)
            .fill(undefined)
            .map((_) => PopRandomElement(active_players, rng).name);
        const singles = Array(stage.n_single_courts)
            .fill(undefined)
            .map((_) => {
            return {
                player_a: PopRandomElement(active_players, rng).name,
                player_b: PopRandomElement(active_players, rng).name,
            };
        });
        const doubles = Array(stage.n_double_courts)
            .fill(undefined)
            .map((_) => {
            return {
                player_a1: PopRandomElement(active_players, rng).name,
                player_a2: PopRandomElement(active_players, rng).name,
                player_b1: PopRandomElement(active_players, rng).name,
                player_b2: PopRandomElement(active_players, rng).name,
            };
        });
        const rotation = {
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
        }
        else if (i % Math.floor(MAX_ATTEMPTS_TO_MAKE_ROTATION_PROPOSALS / MAX_CONSTRAINT_RELAXINGS) ==
            0) {
            can_relax = checker.relaxConstraintsIfPossible();
        }
    }
}
export class ConstraintsChecker {
    constructor(stage, players) {
        this.stage_ = stage;
        this.players_ = players;
        this.rotation_id_ = 0;
        this.relaxings_count_ = 0;
        const n_player_pairs = NChooseK(stage.n_players, 2);
        this.possible_permutations_ = {
            [HappeningType.RESTING]: stage.n_players,
            [HappeningType.PLAYING_SINGLE]: stage.n_players,
            [HappeningType.PLAYING_SINGLE_AGAINST]: n_player_pairs,
            [HappeningType.PLAYING_DOUBLE]: stage.n_players,
            [HappeningType.PLAYING_DOUBLE_AGAINST]: n_player_pairs,
            [HappeningType.PLAYING_DOUBLE_WITH]: n_player_pairs,
        };
        this.happenings_ = {
            [HappeningType.RESTING]: {},
            [HappeningType.PLAYING_SINGLE]: {},
            [HappeningType.PLAYING_SINGLE_AGAINST]: {},
            [HappeningType.PLAYING_DOUBLE]: {},
            [HappeningType.PLAYING_DOUBLE_AGAINST]: {},
            [HappeningType.PLAYING_DOUBLE_WITH]: {},
        };
        this.insertion_rotations_ = {};
        this.constraints_ = ConstraintsForRelaxingsCount(this.relaxings_count_, this.stage_);
    }
    copy() {
        const out = new ConstraintsChecker(this.stage_, this.players_);
        out.rotation_id_ = this.rotation_id_;
        out.relaxings_count_ = this.relaxings_count_;
        out.happenings_ = this.recordCopy(this.happenings_);
        out.insertion_rotations_ = this.recordCopy(this.insertion_rotations_);
        out.constraints_ = this.constraints_; // constraints are immutable, no deep copy required.
        return out;
    }
    add(happening) {
        const serialized = JSON.stringify(happening);
        // Add happening.
        if (!this.happenings_[happening.type][serialized]) {
            this.happenings_[happening.type][serialized] = 0;
        }
        ++this.happenings_[happening.type][serialized];
        // Add insertion rotation.
        if (!this.insertion_rotations_[serialized]) {
            this.insertion_rotations_[serialized] = [];
        }
        this.insertion_rotations_[serialized].push(this.rotation_id_);
    }
    validateAndAdvanceToNextRotation() {
        // Validate cooldowns.
        for (const [happening, insertions] of Object.entries(this.insertion_rotations_)) {
            if (insertions.length < 2) {
                continue;
            }
            const type = JSON.parse(happening).type;
            const observed_cooldown = insertions[insertions.length - 1] - insertions[insertions.length - 2] - 1;
            const min_cooldown = this.constraints_.min_cooldowns[type];
            if (observed_cooldown < min_cooldown) {
                return false;
            }
        }
        // Validate spreads.
        for (const [type, record] of Object.entries(this.happenings_)) {
            const casted_type = type;
            const min = Object.keys(record).length < this.possible_permutations_[casted_type]
                ? 0
                : Math.min(...Object.values(record));
            const max = Math.max(...Object.values(record));
            const observed_spread = max - min;
            const max_spread = this.constraints_.max_spreads[casted_type];
            if (observed_spread > max_spread) {
                return false;
            }
        }
        ++this.rotation_id_;
        return true;
    }
    relaxConstraintsIfPossible() {
        if (this.relaxings_count_ == MAX_CONSTRAINT_RELAXINGS) {
            return false;
        }
        ++this.relaxings_count_;
        this.constraints_ = ConstraintsForRelaxingsCount(this.relaxings_count_, this.stage_);
        return true;
    }
    strictenConstraintsIfPossible() {
        if (this.relaxings_count_ == 0) {
            return false;
        }
        --this.relaxings_count_;
        this.constraints_ = ConstraintsForRelaxingsCount(this.relaxings_count_, this.stage_);
    }
    stage() {
        return this.stage_;
    }
    players() {
        return this.players_;
    }
    deepestRotationReached() {
        return this.rotation_id_;
    }
    reachedEnd() {
        return this.rotation_id_ >= this.stage_.n_rotations;
    }
    relaxingsCount() {
        return this.relaxings_count_;
    }
    possiblePermutations() {
        return this.possible_permutations_;
    }
    happenings() {
        return this.happenings_;
    }
    insertionRotations() {
        return this.insertion_rotations_;
    }
    recordCopy(record) {
        return JSON.parse(JSON.stringify(record));
    }
    stage_;
    players_;
    rotation_id_;
    relaxings_count_;
    possible_permutations_;
    happenings_;
    insertion_rotations_;
    constraints_;
}
function AddStatsOrErrorToRoster(roster) {
    if (!roster.rotations.ok()) {
        return {
            stage_id: roster.checker.stage().id,
            error: roster.rotations.error(),
        };
    }
    const all_happenings = roster.checker.happenings();
    const possible_permutations = roster.checker.possiblePermutations();
    const spreads = Object.keys(all_happenings).reduce(function (result, key) {
        const casted_key = key;
        const happening_counts = Object.values(all_happenings[casted_key]);
        const distribution = Array(possible_permutations[casted_key] - happening_counts.length)
            .fill(0)
            .concat(happening_counts);
        const stats = StatsFromDistribution(distribution);
        if (stats.ok()) {
            result[key] = stats.value();
        }
        return result;
    }, {});
    const cooldowns = Object.keys(all_happenings).reduce(function (result, key) {
        const casted_key = key;
        const happenings = Object.keys(all_happenings[casted_key]);
        const cooldown_counts = happenings.map((h) => {
            const rotation_ids = roster.checker.insertionRotations()[h];
            if (rotation_ids.length < 2) {
                return Infinity;
            }
            let cooldown = Infinity;
            for (let i = 1; i < rotation_ids.length; ++i) {
                cooldown = Math.min(cooldown, rotation_ids[i] - rotation_ids[i - 1] - 1);
            }
            return cooldown;
        });
        const distribution = cooldown_counts.filter((c) => c != Infinity);
        const stats = StatsFromDistribution(distribution);
        if (stats.ok()) {
            result[key] = stats.value();
        }
        return result;
    }, {});
    return {
        stage_id: roster.checker.stage().id,
        rotations: roster.rotations.value(),
        spreads: spreads,
        cooldowns: cooldowns,
    };
}
function StatsFromDistribution(distribution) {
    if (distribution.length == 0) {
        return StatusOr.Error("No distribution.");
    }
    const sorted = [...distribution].sort((a, b) => a - b);
    const total = sorted.length;
    const average = sorted.reduce((acc, val) => acc + val, 0) / total;
    return StatusOr.Ok({
        lowest: sorted[0],
        p25: Round(Quantile(sorted, 0.25).value(), 1),
        p50: Round(Quantile(sorted, 0.5).value(), 1),
        average: Round(average, 1),
        p75: Round(Quantile(sorted, 0.75).value(), 1),
        highest: sorted[total - 1],
        stddev: Round(Math.sqrt(sorted.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / total), 1),
        count: distribution.length,
    });
}
//# sourceMappingURL=algorithm.js.map