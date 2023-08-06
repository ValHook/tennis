import {
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
  Player,
  Stats,
} from "./types.js";
import { Dialog } from "./prompt.js";

// Client ID and API key from the Developer Console
const CLIENT_ID = "519347000672-447857bbs5d55adnk4cqi41vqc74ehgr.apps.googleusercontent.com";
const API_KEY = "AIzaSyBlL5bK9tZXQ9kDkHdBZpgqxuHs5xuFNuk";
// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = "https://sheets.googleapis.com/$discovery/rest?version=v4";
// Authorization scopes required by the API; multiple scopes can be included, separated by spaces.
const SCOPES = "https://www.googleapis.com/auth/drive.file";

let gisLoaded = false;
let gapiInited = false;
let gisAccessToken: GoogleApiOAuth2TokenObject | undefined = undefined;

export function Initialize() {
  document.querySelector("#gapi_auth")?.classList.add("d-none");
  document.querySelector("#gapi_list")?.classList.add("d-none");
  document.querySelector("#gapi_export")?.classList.add("d-none");
  document.querySelector("#gapi_signout")?.classList.add("d-none");

  OnGapiLoaded();
  OnGisLoaded();
}

/**
 * Callback after api.js is loaded.
 */
export function OnGapiLoaded() {
  gapi.load("client", initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });

  gapiInited = true;
  maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
export function OnGisLoaded() {
  gisLoaded = true;
  maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
  if (gisLoaded && gapiInited) {
    document.querySelector("#gapi_busy")?.classList.add("d-none");
  } else {
    document.querySelector("#gapi_busy")?.classList.remove("d-none");
  }
  if (gisLoaded && gapiInited && gisAccessToken === undefined) {
    document.querySelector("#gapi_auth")?.classList.remove("d-none");
  } else {
    document.querySelector("#gapi_auth")?.classList.add("d-none");
  }
  if (gisLoaded && gapiInited && gisAccessToken !== undefined) {
    document.querySelector("#gapi_signout")?.classList.remove("d-none");
    document.querySelector("#gapi_list")?.classList.remove("d-none");
    document.querySelector("#gapi_export")?.classList.remove("d-none");
  } else {
    document.querySelector("#gapi_signout")?.classList.add("d-none");
    document.querySelector("#gapi_list")?.classList.add("d-none");
    document.querySelector("#gapi_export")?.classList.add("d-none");
  }
}

/**
 *  Sign in the user upon button click.
 */
export function SignIn() {
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    prompt: "none",
    callback: (tokenResponse) => {
      if (tokenResponse.error !== undefined) {
        throw tokenResponse;
      }

      // We should now have an access token
      gisAccessToken = gapi.client.getToken();
      maybeEnableButtons();
    },
  });

  onAuth(tokenClient);
}

function onAuth(tokenClient: google.accounts.oauth2.TokenClient) {
  // Prompt the user to select a Google Account and ask for consent to share their data
  // when establishing a new session.
  tokenClient.requestAccessToken({ prompt: "consent" });
  maybeEnableButtons();
}

/**
 *  Sign out the user upon button click.
 */
export function SignOut() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token, () => {});
    gapi.client.setToken(null);
    maybeEnableButtons();
  }
}

export function Export(rosters: StageRoster[], callback: (spreadsheetUrl: string) => void) {
  document.querySelector<HTMLInputElement>("#gapi_export")!.innerText = "Exporting…";
  try {
    const title = "Tennis Roster";
    const sheets = new Array();
    rosters.forEach((roster: StageRoster, index: number): void => {
      const rows = new Array();

      roster.rotations?.forEach((rotation: Rotation): void => {
        rotation.resting_players.forEach((player: string, number: number): void => {
          let row = {
            values: [
              {
                userEnteredValue: {
                  stringValue: `Resting player ${number}`,
                },
              },
              {
                userEnteredValue: {
                  stringValue: player,
                },
              },
            ],
          };
          rows.push(row);
        });
        rotation.singles.forEach((single: MatchSingle, number: number): void => {
          let row = {
            values: [
              {
                userEnteredValue: {
                  stringValue: `Single ${number}`,
                },
              },
              {
                userEnteredValue: {
                  stringValue: `${single.player_a}`,
                },
              },
              {
                userEnteredValue: {
                  stringValue: `${single.player_b}`,
                },
              },
            ],
          };
          rows.push(row);
        });
        rotation.doubles.forEach((double: MatchDouble, number: number): void => {
          let row = {
            values: [
              {
                userEnteredValue: {
                  stringValue: `Double ${number}`,
                },
              },
              {
                userEnteredValue: {
                  stringValue: `${double.player_a1} & ${double.player_a2}`,
                },
              },
              {
                userEnteredValue: {
                  stringValue: `${double.player_b1} & ${double.player_b2}`,
                },
              },
            ],
          };
          rows.push(row);
        });
      });

      let sheet = {
        properties: {
          title: `Roster ${index}`,
        },
        data: [
          {
            rowData: rows,
          },
        ],
      };
      sheets.push(sheet);
    });

    const spreadsheet: gapi.client.sheets.Spreadsheet = {
      properties: {
        title: title,
      },
      sheets: sheets,
    };
    const spreadsheetBody = { resource: spreadsheet };
    gapi.client.sheets.spreadsheets.create(spreadsheetBody).then((response) => {
      const url = `https://docs.google.com/spreadsheets/d/${response.result.spreadsheetId}`;
      if (callback) callback(url);
      document.querySelector<HTMLInputElement>("#gapi_export")!.innerText = "Export";
      console.log("Spreadsheet ID: " + response.result.spreadsheetId);
      //document.querySelector<HTMLInputElement>("#content")?.innerHTML = `<a href="${url}" target="_blank">Spreadsheet</a>`;
      Dialog(
        "Exported",
        `The roster has been successfully exported to <a href="${url}" target="_blank">a new spreadsheet</a>.`,
      );
    });
  } catch (err) {
    //document.querySelector<HTMLInputElement>("#content")!.innerText = err.message;
    document.querySelector<HTMLInputElement>("#gapi_export")!.innerText = "Export";
    Dialog("Error", err);
    return;
  }
}
