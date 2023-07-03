import { SessionFromInput, ComputeRosters } from "./algorithm";
import { MAX_COURTS, MAX_PLAYERS, NUM_PLAYERS_SINGLE } from "./constants";
import { Prompt, PromptInt, Fail, Output } from "./prompt";
import { Session, Input, StageRoster, Player } from "./types";

declare global {
  interface Window {
    input: Input;
    session: Session;
    rosters: StageRoster[];
  }
}

function InputFromDOM(): Input {
  const input: Input = {
    match_duration: 0,
    courts: [],
    players: [],
    seed: Date.now(),
  };
  input.match_duration = PromptInt(
    "inputMatchDuration",
    "Average match duration in minutes?",
    1,
    120
  );
  const n_courts = PromptInt("inputCourtCount", "How many courts?", 1);
  for (let i = 0; i < n_courts; ++i) {
    input.courts.push({
      availability_minutes: PromptInt(
        "inputCourtDuration" + i,
        "Court #" + (i + 1) + " availability in minutes?",
        input.match_duration
      ),
    });
  }
  const sorted_court_availabilities = input.courts
    .map((c) => c.availability_minutes)
    .sort((a, b) => a - b);

  const allowed_durations = new Set(sorted_court_availabilities);
  const court_utilizations = Array<number>(n_courts).fill(0);
  const n_players = PromptInt(
    "inputPlayerCount",
    "How many players?",
    n_courts * NUM_PLAYERS_SINGLE
  );
  const min_minutes = sorted_court_availabilities[0];
  const max_minutes = sorted_court_availabilities[n_courts - 1];
  const player_names = new Set();
  for (let i = 0; i < n_players; ++i) {
    const player: Player = {
      name: Prompt("inputPlayerName" + i, "Player #" + (i + 1) + " name?"),
      availability_minutes: PromptInt(
        "inputPlayerMinutes" + i,
        "Player #" + (i + 1) + " availability in minutes?",
        min_minutes,
        max_minutes,
        allowed_durations
      ),
    };
    if (player_names.has(player.name)) {
      Fail("inputPlayerMinutes" + i, "All players must have distinct names");
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
    const court_underutilization = court_utilizations.reduce(
      (total, utilization) => total + (NUM_PLAYERS_SINGLE - utilization),
      0
    );
    if (remaining_players < court_underutilization) {
      Fail("inputPlayerCount", "Not enough remaining players to correctly utilize all the courts");
    }
    input.players.push(player);
  }
  return input;
}

function DOMFromInput(input: Input) {
  document.querySelector<HTMLInputElement>("#inputMatchDuration")!.value = String(
    input.match_duration
  );
  ChangeCourtCount(input.courts.length);
  document.querySelector<HTMLInputElement>("#inputCourtCount")!.value = String(input.courts.length);
  ChangePlayerCount(input.players.length);
  document.querySelector<HTMLInputElement>("#inputPlayerCount")!.value = String(
    input.players.length
  );
  for (let i = 0; i < input.courts.length; ++i) {
    document.querySelector<HTMLInputElement>("#inputCourtDuration" + i)!.value = String(
      input.courts[i].availability_minutes
    );
  }
  for (let i = 0; i < input.players.length; ++i) {
    document.querySelector<HTMLInputElement>("#inputPlayerName" + i)!.value = String(
      input.players[i].name
    );
  }
  for (let i = 0; i < input.players.length; ++i) {
    document.querySelector<HTMLInputElement>("#inputPlayerMinutes" + i)!.value = String(
      input.players[i].availability_minutes
    );
  }
}

function InputFromHash(hash: string): Input {
  const payload = JSON.parse(atob(hash));
  const court_availabilities = payload[2] as number[];
  const player_names = payload[3] as string[];
  const player_availabilties = payload[4] as number[];
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

function HashFromInput(input: Input): string {
  const payload = [
    input.seed,
    input.match_duration,
    input.courts.map((c) => c.availability_minutes),
    input.players.map((p) => p.name),
    input.players.map((p) => p.availability_minutes),
  ];
  return btoa(JSON.stringify(payload));
}

function ChangeCourtCount(count: number) {
  document.querySelector<HTMLInputElement>("#courtCount")!.innerText = String(count);
  for (let i = 0; i < MAX_COURTS; ++i) {
    if (i < count) {
      document.querySelector("#court" + i)?.classList.remove("d-none");
    } else {
      document.querySelector("#court" + i)?.classList.add("d-none");
    }
  }
}

function ChangePlayerCount(count: number) {
  document.querySelector<HTMLInputElement>("#playerCount")!.innerText = String(count);
  for (let i = 0; i < MAX_PLAYERS; ++i) {
    if (i < count) {
      document.querySelector("#player" + i)?.classList.remove("d-none");
    } else {
      document.querySelector("#player" + i)?.classList.add("d-none");
    }
  }
}

function Generate() {
  window.session = SessionFromInput(window.input);
  window.rosters = ComputeRosters(window.session, window.input.seed);
  document.getElementById("regenerate")?.classList.remove("d-none");
  document.getElementById("clipboard")?.classList.remove("d-none");
  Output(window.rosters);
}

function OnDOMReady() {
  // Initial sync # of courts & players.
  ChangeCourtCount(parseInt(document.querySelector<HTMLInputElement>("#inputCourtCount")!.value));
  ChangePlayerCount(parseInt(document.querySelector<HTMLInputElement>("#inputPlayerCount")!.value));

  // # of courts & # of players change listeners.
  document
    .querySelector<HTMLInputElement>("#inputCourtCount")
    ?.addEventListener("change", (event) => {
      ChangeCourtCount(parseInt((event?.target as HTMLInputElement)?.value));
    });
  document
    .querySelector<HTMLInputElement>("#inputPlayerCount")
    ?.addEventListener("change", (event) => {
      ChangePlayerCount(parseInt((event?.target as HTMLInputElement)?.value));
    });

  // Generate, re-generate & copy buttons.
  document.querySelectorAll<HTMLInputElement>("#generate, #regenerate").forEach((element) => {
    element.addEventListener("click", (_) => {
      window.input = InputFromDOM();
      window.history.pushState(null, "", "#" + HashFromInput(window.input));
      Generate();
    });
  });
  document.querySelector<HTMLInputElement>("#clipboard")?.addEventListener("click", (_) => {
    navigator.clipboard.writeText(document.querySelector<HTMLInputElement>("#output")!.innerText);
  });

  // Input error cleaners.
  document.querySelectorAll("input[type=text]").forEach((element) => {
    element.addEventListener("input", (_) => element.classList.remove("is-invalid"));
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

window.addEventListener("DOMContentLoaded", (event) => {
  OnDOMReady();
  window.onhashchange = OnHashChange;
  if (window.location.hash) {
    OnHashChange();
  }
});
