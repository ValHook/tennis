import { SessionFromInput, ComputeRoster } from "./algorithm";
import { MAX_COURTS, MAX_PLAYERS, NUM_PLAYERS_SINGLE } from "./constants";
import { Prompt, PromptInt, Fail, Output } from "./prompt";
import { StatusOr } from "./status";
import { Session, Input, Rotation, Roster } from "./types";

declare global {
  interface Window {
    input: Input;
    session: Session;
    roster: Roster;
  }
}

function InputFromDOM(): Input {
  const input: Input = {
    match_duration: 0,
    court_availabilities: [],
    player_names: [],
    player_availabilties: [],
  };
  input.match_duration = PromptInt(
    "inputMatchDuration",
    "Average match duration in minutes?",
    1,
    120
  );
  const n_courts = PromptInt("inputCourtCount", "How many courts?", 1);
  for (let i = 0; i < n_courts; ++i) {
    input.court_availabilities.push(
      PromptInt(
        "inputCourtDuration" + i,
        "Court #" + (i + 1) + " availability in minutes?",
        input.match_duration
      )
    );
  }
  input.court_availabilities.sort((a, b) => a - b);

  const allowed_durations = new Set(input.court_availabilities);
  const court_utilizations = Array<number>(n_courts).fill(0);
  const n_players = PromptInt(
    "inputPlayerCount",
    "How many players?",
    n_courts * NUM_PLAYERS_SINGLE
  );
  const min_minutes = input.court_availabilities[0];
  const max_minutes = input.court_availabilities[n_courts - 1];
  const player_names = new Set();
  for (let i = 0; i < n_players; ++i) {
    const player_name = Prompt(
      "inputPlayerName" + i,
      "Player #" + (i + 1) + " name?"
    );
    const player_availabilty = PromptInt(
      "inputPlayerMinutes" + i,
      "Player #" + (i + 1) + " availability in minutes?",
      min_minutes,
      max_minutes,
      allowed_durations
    );
    if (player_names.has(player_name)) {
      Fail("inputPlayerMinutes" + i, "All players must have distinct names");
    }
    player_names.add(player_name);
    for (let j = n_courts - 1; j >= 0; --j) {
      if (court_utilizations[j] == NUM_PLAYERS_SINGLE) {
        continue;
      }
      if (input.court_availabilities[j] > player_availabilty) {
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
      Fail(
        "inputPlayerCount",
        "Not enough remaining players to correctly utilize all the courts"
      );
    }
    input.player_names.push(player_name);
    input.player_availabilties.push(player_availabilty);
  }
  input.player_names = input.player_names
    .map((n, i) => {
      return { name: n, index: i };
    })
    .sort(
      (a, b) =>
        input.player_availabilties[a.index] -
        input.player_availabilties[b.index]
    )
    .map((ni) => ni.name);
  input.player_availabilties.sort((a, b) => a - b);
  return input;
}

function ChangeCourtCount(count: number) {
  document.querySelector<HTMLInputElement>("#courtCount")!.innerText =
    String(count);
  for (let i = 0; i < MAX_COURTS; ++i) {
    if (i < count) {
      document.querySelector("#court" + i)?.classList.remove("d-none");
    } else {
      document.querySelector("#court" + i)?.classList.add("d-none");
    }
  }
}

function ChangePlayerCount(count: number) {
  document.querySelector<HTMLInputElement>("#playerCount")!.innerText =
    String(count);
  for (let i = 0; i < MAX_PLAYERS; ++i) {
    if (i < count) {
      document.querySelector("#player" + i)?.classList.remove("d-none");
    } else {
      document.querySelector("#player" + i)?.classList.add("d-none");
    }
  }
}

function Generate() {
  window.input = InputFromDOM();
  window.session = SessionFromInput(window.input);
  window.roster = ComputeRoster(window.session, Date.now());
  document.getElementById("regenerate")?.classList.remove("d-none");
  document.getElementById("clipboard")?.classList.remove("d-none");
  Output(window.roster);
}

function OnDOMReady() {
  // Initial sync # of courts & players.
  ChangeCourtCount(
    parseInt(
      document.querySelector<HTMLInputElement>("#inputCourtCount")!.value
    )
  );
  ChangePlayerCount(
    parseInt(
      document.querySelector<HTMLInputElement>("#inputPlayerCount")!.value
    )
  );

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
  document
    .querySelector<HTMLInputElement>("#generate")
    ?.addEventListener("click", (_) => {
      Generate();
    });
  document
    .querySelector<HTMLInputElement>("#regenerate")
    ?.addEventListener("click", (_) => {
      Generate();
    });
  document
    .querySelector<HTMLInputElement>("#clipboard")
    ?.addEventListener("click", (_) => {
      navigator.clipboard.writeText(
        document.querySelector<HTMLInputElement>("#output")!.innerText
      );
    });

  // Input error cleaners.
  document.querySelectorAll("input[type=text]").forEach((element) => {
    element.addEventListener("input", (_) =>
      element.classList.remove("is-invalid")
    );
  });
}

window.addEventListener("DOMContentLoaded", (event) => {
  OnDOMReady();
});
