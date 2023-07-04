import { StatusOr } from "./status";

export interface Input {
  match_duration: number;
  courts: Court[];
  players: Player[];
  seed: number;
}

export interface Court {
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
  n_active_players: number;
  n_single_players: number;
  n_double_players: number;
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

export interface Constraints {
  max_spreads: { [key in HappeningType]: number };
  min_cooldowns: { [key in HappeningType]: number };
}

export interface StageRoster {
  stage_id: number;
  rotations: StatusOr<Rotation[]>;
  deepest_rotation_reached: number;
  relaxings_count: number;
}

export enum HappeningType {
  RESTING = "RESTING",
  PLAYING_SINGLE = "PLAYING_SINGLE",
  PLAYING_SINGLE_AGAINST = "PLAYING_SINGLE_AGAINST",
  PLAYING_DOUBLE = "PLAYING_DOUBLE",
  PLAYING_DOUBLE_AGAINST = "PLAYING_DOUBLE_AGAINST",
  PLAYING_DOUBLE_WITH = "PLAYING_DOUBLE_WITH",
}

export class Happening {
  static Resting(player: string) {
    return new Happening(player, null, HappeningType.RESTING);
  }
  static PlayingSingle(player: string) {
    return new Happening(player, null, HappeningType.PLAYING_SINGLE);
  }
  static PlayingSingleAgainst(player_a: string, player_b: string) {
    const players = [player_a, player_b].sort();
    return new Happening(players[0], players[1], HappeningType.PLAYING_SINGLE_AGAINST);
  }
  static PlayingDouble(player: string) {
    return new Happening(player, null, HappeningType.PLAYING_DOUBLE);
  }
  static PlayingDoubleAgainst(player_a: string, player_b: string) {
    const players = [player_a, player_b].sort();
    return new Happening(players[0], players[1], HappeningType.PLAYING_DOUBLE_AGAINST);
  }
  static PlayingDoubleWith(player_a: string, player_b: string) {
    const players = [player_a, player_b].sort();
    return new Happening(players[0], players[1], HappeningType.PLAYING_DOUBLE_WITH);
  }
  protected constructor(player_a: string, player_b: string | null, type: HappeningType) {
    this.player_a = player_a;
    this.player_b = player_b;
    this.type = type;
  }
  public player_a: string;
  public player_b: string | null;
  public type: HappeningType;
}
