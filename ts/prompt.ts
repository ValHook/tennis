// The import is fine; it's just declared in the HTML
declare var bootstrap: any;

export function Prompt(id: string, ask: string): string {
  Reset(id);
  const input = document.querySelector<HTMLInputElement>("#" + id);
  const result = input ? input.value : (window.prompt(ask) || "").replace(/\s/g, "");
  if (!result.length) {
    Fail(id, "Not a valid string");
  }
  return result;
}

export function PromptInt(
  id: string,
  ask: string,
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER,
  multiple_of: number | undefined = undefined,
): number {
  Reset(id);
  const input = document.querySelector<HTMLInputElement>("#" + id);
  const result = input ? parseInt(input.value) : parseInt(window.prompt(ask) || "");
  if (isNaN(result)) {
    Fail(id, "Not a valid number");
  }
  if (result < min || result > max) {
    Fail(id, "Number " + result + " must be between " + min + " and " + max);
  }
  if (multiple_of && result % multiple_of != 0) {
    Fail(id, "Number " + result + " must be a multiple of " + multiple_of);
  }
  return result;
}

export function Reset<T>(id: string) {
  const input = document.querySelector<HTMLInputElement>("#" + id);
  if (input) {
    input.classList.remove("is-invalid");
  }
}

export function Fail<T>(id: string, output: T) {
  const input = document.querySelector<HTMLInputElement>("#" + id);
  if (input) {
    input.classList.add("is-invalid");
    const feedback = input.parentElement?.getElementsByClassName("invalid-feedback");
    if (feedback?.length) {
      (<HTMLElement>feedback[0]).innerText = String(output);
    }
  } else {
    Dialog("Error", output);
  }
  throw new Error(String(output));
}

export function Dialog<T>(title: string, message: T) {
  document.querySelector<HTMLInputElement>("#modalTitle")!.innerHTML = title;
  const text = typeof message === "string" ? message : JSON.stringify(message, undefined, 2);
  document.querySelector<HTMLInputElement>("#modalText")!.innerHTML = text;
  new bootstrap.Modal("#modal", {}).show();
}

export function Output<T>(output: T) {
  const out = typeof output === "string" ? output : JSON.stringify(output, undefined, 2);
  document.querySelector<HTMLInputElement>("#output")!.innerText = out;
  document.querySelector("#outputBox")!.classList.remove("d-none");
  document.querySelector("#outputBox")!.scrollIntoView({ behavior: "smooth", inline: "nearest" });
}
