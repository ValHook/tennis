export var HappeningType;
(function (HappeningType) {
    HappeningType["RESTING"] = "RESTING";
    HappeningType["PLAYING_SINGLE"] = "PLAYING_SINGLE";
    HappeningType["PLAYING_SINGLE_AGAINST"] = "PLAYING_SINGLE_AGAINST";
    HappeningType["PLAYING_DOUBLE"] = "PLAYING_DOUBLE";
    HappeningType["PLAYING_DOUBLE_AGAINST"] = "PLAYING_DOUBLE_AGAINST";
    HappeningType["PLAYING_DOUBLE_WITH"] = "PLAYING_DOUBLE_WITH";
})(HappeningType || (HappeningType = {}));
export class Happening {
    static Resting(player) {
        return new Happening(player, null, HappeningType.RESTING);
    }
    static PlayingSingle(player) {
        return new Happening(player, null, HappeningType.PLAYING_SINGLE);
    }
    static PlayingSingleAgainst(player_a, player_b) {
        const players = [player_a, player_b].sort();
        return new Happening(players[0], players[1], HappeningType.PLAYING_SINGLE_AGAINST);
    }
    static PlayingDouble(player) {
        return new Happening(player, null, HappeningType.PLAYING_DOUBLE);
    }
    static PlayingDoubleAgainst(player_a, player_b) {
        const players = [player_a, player_b].sort();
        return new Happening(players[0], players[1], HappeningType.PLAYING_DOUBLE_AGAINST);
    }
    static PlayingDoubleWith(player_a, player_b) {
        const players = [player_a, player_b].sort();
        return new Happening(players[0], players[1], HappeningType.PLAYING_DOUBLE_WITH);
    }
    constructor(player_a, player_b, type) {
        this.player_a = player_a;
        this.player_b = player_b;
        this.type = type;
    }
    player_a;
    player_b;
    type;
}
//# sourceMappingURL=types.js.map