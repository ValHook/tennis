import { HappeningType } from "./types.js";
export const MAX_COURTS = 4;
export const MAX_PLAYERS = 12;
export const MAX_SIMULATIONS_PER_NODE = 100;
export const NUM_PLAYERS_SINGLE = 2;
export const NUM_PLAYERS_DOUBLE = 4;
export const MAX_DELTAS_PER_HAPPENING_TYPE = {
    [HappeningType.RESTING]: 1,
    [HappeningType.PLAYING_SINGLE]: 1,
    [HappeningType.PLAYING_SINGLE_AGAINST]: 1,
    [HappeningType.PLAYING_DOUBLE]: 1,
    [HappeningType.PLAYING_DOUBLE_AGAINST]: 2,
    [HappeningType.PLAYING_DOUBLE_WITH]: 1,
};
//# sourceMappingURL=constants.js.map