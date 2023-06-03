import {
    Court, Player, Stage, Session, Fixtures, Constraints, ConstraintGauges,
    PairwiseKey, PairwiseKeyFromNames, CopyGauges, Rotation, ValidateGauges,
    MatchSingle, MatchDouble, ClockDownCooldowns
} from "./types";
import { Fail, Prompt, PromptInt } from "./prompt";
import { MATCH_DURATION_MINUTES, MAX_SIMULATIONS_PER_NODE } from "./constants";
import { StatusOr } from "./status";
import { Rng, Mulberry32, PopRandomElement } from "./rng";

function SessionFromInput(): Session {
    const courts: Court[] = [];
    const n_courts = PromptInt("How many courts?", 1);
    for (let i = 0; i < n_courts; ++i) {
        courts.push({
            id: i+1,
            availability_minutes: 
                PromptInt("Court #" + (i+1) + " minutes?", MATCH_DURATION_MINUTES)
        });
    }
    courts.sort((a, b) => b.availability_minutes - a.availability_minutes);
    courts.forEach((c, i) => c.id = i);
    
    const players: Player[] = [];
    const allowed_durations = new Set(courts.map(c=>c.availability_minutes));
    const remaining_court_gauges = Array(n_courts).fill(2);
    const n_players = PromptInt("How many players?", n_courts*2);
    const min_minutes = courts[n_courts-1].availability_minutes;
    const max_minutes = courts[0].availability_minutes;
    const player_names = new Set();
    for (let i = 0; i < n_players; ++i) {
        const player = {
            id: i,
            name: Prompt("Player #" + (i+1) + " name?"),
            availability_minutes: PromptInt("Player #" + (i+1) + " minutes?", 
                                            min_minutes, max_minutes, allowed_durations)
        };
        if (player_names.has(player.name)) {
            throw new Error("All players must have distinct names");
        }
        player_names.add(player.name);
        for (let j = 0; j < n_courts; ++j) {
            if (remaining_court_gauges[j] == 0) {
                continue;
            }
            if (courts[j].availability_minutes > player.availability_minutes) {
                continue;
            }
            remaining_court_gauges[j] -= 1;
            break;
        }
        const remaining_players = n_players - i - 1;
        const unfilled_gauge = remaining_court_gauges.reduce((t, q) => t + q, 0);
        if (remaining_players < unfilled_gauge) {
            throw new Error("Not enough remaining players to correctly utilize all the courts");
        }
        players.push(player);
    }
    players.sort((a, b) => b.availability_minutes - a.availability_minutes);

    const stages: Stage[] = [];
    const stage_durations = Array.from(allowed_durations).sort((a, b) => b - a)
        .map((s, i, a) => i + 1 == a.length ? s : s - a[i+1]);
    let start_minutes = 0;
    for (let i = 0; i < stage_durations.length; ++i) {
        const duration = stage_durations[i];
        const end_minutes = start_minutes + duration;
        let remaining_courts =  courts.findIndex(c=>c.availability_minutes < end_minutes);
        if (remaining_courts == -1) {
            remaining_courts = n_courts;
        }
        let remaining_players = players.findIndex(p=>p.availability_minutes < end_minutes);
        if (remaining_players == -1) {
            remaining_players = n_players;
        }
        const n_rotations = Math.floor(duration/MATCH_DURATION_MINUTES); 
        const stage: Stage = {
            id: i+1,
            start_minutes,
            end_minutes,
            n_rotations,
            n_matches: n_rotations*remaining_courts,
            n_players: remaining_players,
            n_courts: remaining_courts,
            n_single_courts: 0,
            n_double_courts: 0,
            n_resting_players_per_rotation: 0
        };
        for (; remaining_courts > 0; --remaining_courts) {
            if (remaining_courts*4 > remaining_players) {
                stage.n_single_courts += 1;
                remaining_players -= 2;
            } else {
                stage.n_double_courts += 1;
                remaining_players -= 4;
            }
        }
        stage.n_resting_players_per_rotation = remaining_players;
        stages.push(stage);
        start_minutes += duration;
    }
    
    return { courts, players, stages };
}

function FixturesFromStage(stage: Stage, players: Player[], seed: number): StatusOr<Fixtures> {
    const n_single_courts = stage.n_single_courts
    const n_double_courts = stage.n_double_courts;
    const resting_probability = stage.n_resting_players_per_rotation/stage.n_players;
    const single_probability = n_single_courts*2/stage.n_players;
    const double_probability = n_double_courts*4/stage.n_players;
    const pairwise_single_probability = 
        Math.pow(single_probability, 2)/(Math.abs(n_single_courts*2-1));
    const pairwise_double_probability =
        Math.pow(double_probability, 2)/(Math.abs(n_double_courts*4-1));
    
    const resting_max = Math.ceil(resting_probability*stage.n_rotations);
    const single_max = Math.ceil(single_probability*stage.n_rotations);
    const double_max = Math.ceil(double_probability*stage.n_rotations);
    const pairwise_single_max = Math.ceil(pairwise_single_probability*stage.n_rotations);
    const pairwise_double_max = Math.ceil(pairwise_double_probability*stage.n_rotations);
    const resting_cooldown = Math.floor(stage.n_rotations/resting_max - 1);
    const single_cooldown = Math.floor(stage.n_rotations/single_max - 1);
    const double_cooldown = Math.floor(stage.n_rotations/double_max - 1);
    const pairwise_single_cooldown = Math.floor(stage.n_rotations/pairwise_single_max - 1);
    const pairwise_double_cooldown = Math.floor(stage.n_rotations/pairwise_double_max - 1);
    const constraints: Constraints = {
        resting_max,
        single_max,
        double_max,
        pairwise_single_max,
        pairwise_double_max,
        resting_cooldown,
        single_cooldown,
        double_cooldown,
        pairwise_single_cooldown,
        pairwise_double_cooldown,
    };
    
    const resting_max_gauge = new Map<string, number>();
    const single_max_gauge = new Map<string, number>();
    const double_max_gauge = new Map<string, number>();
    const pairwise_single_max_gauge = new Map<PairwiseKey, number>();
    const pairwise_double_max_gauge = new Map<PairwiseKey, number>();
    const resting_cooldown_gauge = new Map<string, number>();
    const single_cooldown_gauge = new Map<string, number>();
    const double_cooldown_gauge = new Map<string, number>();
    const pairwise_single_cooldown_gauge = new Map<PairwiseKey, number>();
    const pairwise_double_cooldown_gauge = new Map<PairwiseKey, number>();
    for (let i = 0; i < stage.n_players; ++i) {
        resting_max_gauge.set(players[i].name, 0);
        single_max_gauge.set(players[i].name, 0);
        double_max_gauge.set(players[i].name, 0);
        resting_cooldown_gauge.set(players[i].name, 0);
        single_cooldown_gauge.set(players[i].name, 0);
        double_cooldown_gauge.set(players[i].name, 0);
        for (let j = i+1; j < stage.n_players; ++j) {
            pairwise_single_max_gauge.set(
                PairwiseKeyFromNames(players[i].name, players[j].name), 0);
            pairwise_double_max_gauge.set(
                PairwiseKeyFromNames(players[i].name, players[j].name), 0);
            pairwise_single_cooldown_gauge.set(
                PairwiseKeyFromNames(players[i].name, players[j].name), 0);
            pairwise_double_cooldown_gauge.set(
                PairwiseKeyFromNames(players[i].name, players[j].name), 0);
        }
    }
    const gauges: ConstraintGauges = {
        resting_max: resting_max_gauge,
        single_max: single_max_gauge,
        double_max: double_max_gauge,
        pairwise_single_max: pairwise_single_max_gauge,
        pairwise_double_max: pairwise_double_max_gauge,
        resting_cooldown: resting_cooldown_gauge,
        single_cooldown: single_cooldown_gauge,
        double_cooldown: double_cooldown_gauge,
        pairwise_single_cooldown: pairwise_single_cooldown_gauge,
        pairwise_double_cooldown: pairwise_double_cooldown_gauge,
    }
    return RotationsFromStageRecursive(stage, players, 0, constraints, gauges, Mulberry32(seed))
        .transform((rotations) => { return {rotations} });
}

function RotationsFromStageRecursive(stage: Stage, players: Player[], rotation_counter: number,
    constraints: Constraints, gauges: ConstraintGauges, rng: Rng): StatusOr<Rotation[]> {
        if (rotation_counter >= stage.n_rotations) {
            return StatusOr.Ok([]);
        }
        for (let i = 0; i < MAX_SIMULATIONS_PER_NODE; ++i) {
            // Generate rotation proposal.
            const sorted_players = [...players].sort((a, b) => 0.5 - rng());
            const resting_players = Array(stage.n_resting_players_per_rotation)
                .fill(undefined)
                .map(_ => PopRandomElement(sorted_players, rng).name);
            const singles: MatchSingle[] = Array(stage.n_single_courts)
                .fill(undefined)
                .map(_ => {
                    return {
                        player_a: PopRandomElement(sorted_players, rng).name,
                        player_b: PopRandomElement(sorted_players, rng).name
                    }
                });
            const doubles: MatchDouble[] = Array(stage.n_double_courts)
                .fill(undefined)
                .map(_ => {
                    return {
                        player_a1: PopRandomElement(sorted_players, rng).name,
                        player_a2: PopRandomElement(sorted_players, rng).name,
                        player_b1: PopRandomElement(sorted_players, rng).name,
                        player_b2: PopRandomElement(sorted_players, rng).name,
                    }
                });
            // Update & validate gauges.
            const updated_gauges = CopyGauges(gauges);
            ClockDownCooldowns(updated_gauges, constraints);
            resting_players.forEach(p => {
                updated_gauges.resting_max.set(p, updated_gauges.resting_max.get(p)! + 1);
                updated_gauges.resting_cooldown.set(p,
                    Math.max(
                        constraints.resting_cooldown,
                        updated_gauges.resting_cooldown.get(p)! + 1 + constraints.resting_cooldown
                    )
                );
            });
            singles.forEach(m => {
                function update(p: string) {
                    updated_gauges.single_max.set(p, updated_gauges.single_max.get(p)! + 1);
                    updated_gauges.single_cooldown.set(p, 
                        Math.max(
                            constraints.single_cooldown,
                         updated_gauges.single_cooldown.get(p)! + 1 + constraints.single_cooldown
                        )
                    );
                }
                function update_pair(a: string, b: string) {
                    const key = PairwiseKeyFromNames(a, b);
                    updated_gauges.pairwise_single_max
                        .set(key, updated_gauges.pairwise_single_max.get(key)! + 1);
                    updated_gauges.pairwise_single_cooldown.set(key,
                        Math.max(
                            constraints.pairwise_single_cooldown,
                            updated_gauges.pairwise_single_cooldown.get(key)! + 1 +
                                constraints.pairwise_single_cooldown
                        )
                    );
                }
                update(m.player_a);
                update(m.player_b);
                update_pair(m.player_a, m.player_b);
            });
            doubles.forEach(m => {
                function update(p: string) {
                    updated_gauges.double_max.set(p, updated_gauges.double_max.get(p)! + 1);
                    updated_gauges.double_cooldown.set(p,
                        Math.max(
                            constraints.double_cooldown,
                            updated_gauges.double_cooldown.get(p)! + 1 + constraints.double_cooldown
                        )
                    );
                }
                function update_pair(a: string, b: string) {
                    const key = PairwiseKeyFromNames(a, b);
                    updated_gauges.pairwise_double_max
                        .set(key, updated_gauges.pairwise_double_max.get(key)! + 1);
                    updated_gauges.pairwise_single_cooldown.set(key,
                        Math.max(
                            constraints.pairwise_single_cooldown,
                            updated_gauges.pairwise_single_cooldown.get(key)! + 1 +
                                constraints.pairwise_single_cooldown
                        )
                    );
                }
                update(m.player_a1);
                update(m.player_a2);
                update(m.player_b1);
                update(m.player_b2);
                update_pair(m.player_a1, m.player_a2);
                update_pair(m.player_b1, m.player_b2);
            });
            const rotation: Rotation = { singles, doubles, resting_players };
             if (!ValidateGauges(updated_gauges, constraints)) {
                continue;
             }
            // Recurse.
            const next_rotations = RotationsFromStageRecursive(stage, players, rotation_counter + 1, 
                constraints, updated_gauges, rng);
            if (!next_rotations.ok()) {
                continue;
            }
            return StatusOr.Ok([rotation].concat(next_rotations.value()));
        }
        return StatusOr.Error<Rotation[]>("Failed to create fixtures with the given constraints.");
}

function main() {
    const session = SessionFromInput();
    for (const stage of session.stages) {
        const fixtures = FixturesFromStage(stage, session.players, Date.now());
        Fail(fixtures);
    }
}

window.onload = main;