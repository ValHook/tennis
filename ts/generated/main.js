import { SessionFromInput, ComputeRosters } from "./algorithm.js";
import { MAX_COURTS, MAX_PLAYERS, NUM_PLAYERS_SINGLE } from "./constants.js";
import { Prompt, PromptInt, Fail, Output } from "./prompt.js";
import { Initialize, SignIn, SignOut, Export } from "./gapi.js";
function InputFromDOM() {
    const input = {
        match_duration: 0,
        courts: [],
        players: [],
        seed: Date.now(),
    };
    input.match_duration = PromptInt("inputMatchDuration", "Average match duration in minutes?", 1, Infinity);
    const n_courts = PromptInt("inputCourtCount", "How many courts?", 1);
    for (let i = 0; i < n_courts; ++i) {
        input.courts.push({
            availability_minutes: PromptInt("inputCourtDuration" + i, "Court #" + (i + 1) + " availability in minutes?", input.match_duration, Infinity, input.match_duration),
        });
    }
    const sorted_court_availabilities = input.courts
        .map((c) => c.availability_minutes)
        .sort((a, b) => a - b);
    const allowed_durations = new Set(sorted_court_availabilities);
    const court_utilizations = Array(n_courts).fill(0);
    const n_players = PromptInt("inputPlayerCount", "How many players?", n_courts * NUM_PLAYERS_SINGLE);
    const min_minutes = 0;
    const max_minutes = sorted_court_availabilities[n_courts - 1];
    const player_names = new Set();
    for (let i = 0; i < n_players; ++i) {
        const player = {
            name: Prompt("inputPlayerName" + i, "Player #" + (i + 1) + " name?"),
            availability_minutes: PromptInt("inputPlayerMinutes" + i, "Player #" + (i + 1) + " availability in minutes?", min_minutes, max_minutes, input.match_duration),
        };
        if (player_names.has(player.name)) {
            Fail("inputPlayerName" + i, "All players must have distinct names");
        }
        player_names.add(player.name);
        for (let j = n_courts - 1; j >= 0; --j) {
            if (court_utilizations[j] == NUM_PLAYERS_SINGLE) {
                continue;
            }
            if (sorted_court_availabilities[j] > player.availability_minutes) {
                continue;
            }
            court_utilizations[j] += 1;
            break;
        }
        const remaining_players = n_players - i - 1;
        const court_underutilization = court_utilizations.reduce((total, utilization) => total + (NUM_PLAYERS_SINGLE - utilization), 0);
        if (remaining_players < court_underutilization) {
            Fail("inputPlayerMinutes" + i, "Not enough remaining players to correctly utilize all the courts");
        }
        input.players.push(player);
    }
    return input;
}
function DOMFromInput(input) {
    document.querySelector("#inputMatchDuration").value = String(input.match_duration);
    ChangeCourtCount(input.courts.length);
    document.querySelector("#inputCourtCount").value = String(input.courts.length);
    ChangePlayerCount(input.players.length);
    document.querySelector("#inputPlayerCount").value = String(input.players.length);
    for (let i = 0; i < input.courts.length; ++i) {
        document.querySelector("#inputCourtDuration" + i).value = String(input.courts[i].availability_minutes);
    }
    for (let i = 0; i < input.players.length; ++i) {
        document.querySelector("#inputPlayerName" + i).value = String(input.players[i].name);
    }
    for (let i = 0; i < input.players.length; ++i) {
        document.querySelector("#inputPlayerMinutes" + i).value = String(input.players[i].availability_minutes);
    }
}
function InputFromHash(hash) {
    const payload = JSON.parse(atob(hash));
    const court_availabilities = payload[2];
    const player_names = payload[3];
    const player_availabilties = payload[4];
    return {
        seed: payload[0],
        match_duration: payload[1],
        courts: court_availabilities.map((a) => {
            return { availability_minutes: a };
        }),
        players: player_names.map((n, i) => {
            return { name: n, availability_minutes: player_availabilties[i] };
        }),
    };
}
function HashFromInput(input) {
    const payload = [
        input.seed,
        input.match_duration,
        input.courts.map((c) => c.availability_minutes),
        input.players.map((p) => p.name),
        input.players.map((p) => p.availability_minutes),
    ];
    return btoa(JSON.stringify(payload));
}
function ChangeCourtCount(count) {
    document.querySelector("#courtCount").innerText = String(count);
    for (let i = 0; i < MAX_COURTS; ++i) {
        if (i < count) {
            document.querySelector("#court" + i)?.classList.remove("d-none");
        }
        else {
            document.querySelector("#court" + i)?.classList.add("d-none");
        }
    }
}
function ChangePlayerCount(count) {
    document.querySelector("#playerCount").innerText = String(count);
    for (let i = 0; i < MAX_PLAYERS; ++i) {
        if (i < count) {
            document.querySelector("#player" + i)?.classList.remove("d-none");
        }
        else {
            document.querySelector("#player" + i)?.classList.add("d-none");
        }
    }
}
function Generate() {
    window.session = SessionFromInput(window.input);
    window.rosters = ComputeRosters(window.session, window.input.seed);
    document.getElementById("regenerate")?.classList.remove("d-none");
    document.getElementById("copy-json")?.classList.remove("d-none");
    // Switch to the right tab
    var triggerEl = document.querySelector("#tab-json");
    bootstrap.Tab.getInstance(triggerEl).show();
    document.querySelector("#tab-json")?.removeAttribute("aria-disabled");
    document.querySelector("#tab-json")?.classList.remove("disabled");
    Output(window.rosters);
}
function OnDOMReady() {
    // Initial sync # of courts & players.
    ChangeCourtCount(parseInt(document.querySelector("#inputCourtCount").value));
    ChangePlayerCount(parseInt(document.querySelector("#inputPlayerCount").value));
    // # of courts & # of players change listeners.
    document
        .querySelector("#inputCourtCount")
        ?.addEventListener("change", (event) => {
        ChangeCourtCount(parseInt(event?.target?.value));
    });
    document
        .querySelector("#inputPlayerCount")
        ?.addEventListener("change", (event) => {
        ChangePlayerCount(parseInt(event?.target?.value));
    });
    // Generate, re-generate & copy buttons.
    document.querySelectorAll("#btn-generate, #btn-generate").forEach((element) => {
        element.addEventListener("click", (_) => {
            window.input = InputFromDOM();
            window.history.pushState(null, "", "#" + HashFromInput(window.input));
            Generate();
        });
    });
    document.querySelector("#copy-json")?.addEventListener("click", (_) => {
        navigator.clipboard.writeText(document.querySelector("#output").innerText);
    });
    document.querySelector("#copy-url")?.addEventListener("click", (_) => {
        navigator.clipboard.writeText(document.URL);
    });
    // Input error cleaners.
    document.querySelectorAll("input[type=text]").forEach((element) => {
        element.addEventListener("input", (_) => element.classList.remove("is-invalid"));
    });
    Initialize();
    document.querySelector("#gapi_auth")?.addEventListener("click", (_) => {
        SignIn();
    });
    document.querySelector("#gapi_export")?.addEventListener("click", (_) => {
        Export(window.rosters, (url) => {
            openInNewTab(url);
        });
    });
    document.querySelector("#gapi_signout")?.addEventListener("click", (_) => {
        SignOut();
    });
    var triggerTabList = [].slice.call(document.querySelectorAll("#navbar button"));
    triggerTabList.forEach(function (triggerEl) {
        var tabTrigger = new bootstrap.Tab(triggerEl);
        triggerEl.addEventListener("click", function (event) {
            event.preventDefault();
            tabTrigger.show();
        });
    });
}
function OnHashChange() {
    if (!window.location.hash) {
        window.location.reload();
        return;
    }
    window.input = InputFromHash(window.location.hash.substring(1));
    DOMFromInput(window.input);
    Generate();
}
function openInNewTab(url) {
    window.open(url, "_blank")?.focus();
}
window.addEventListener("DOMContentLoaded", (event) => {
    OnDOMReady();
    window.onhashchange = OnHashChange;
    if (window.location.hash) {
        OnHashChange();
    }
});
//# sourceMappingURL=main.js.map