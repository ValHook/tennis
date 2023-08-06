// @ts-ignore
import * as bootstrap from "../../node_modules/bootstrap/dist/js/bootstrap.esm.min.js";
export function Prompt(id, ask) {
    Reset(id);
    const input = document.querySelector("#" + id);
    const result = input ? input.value : (window.prompt(ask) || "").replace(/\s/g, "");
    if (!result.length) {
        Fail(id, "Not a valid string");
    }
    return result;
}
export function PromptInt(id, ask, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, multiple_of = undefined) {
    Reset(id);
    const input = document.querySelector("#" + id);
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
export function Reset(id) {
    const input = document.querySelector("#" + id);
    if (input) {
        input.classList.remove("is-invalid");
    }
}
export function Fail(id, output) {
    const input = document.querySelector("#" + id);
    if (input) {
        input.classList.add("is-invalid");
        const feedback = input.parentElement?.getElementsByClassName("invalid-feedback");
        if (feedback?.length) {
            feedback[0].innerText = String(output);
        }
    }
    else {
        Dialog("Error", output);
    }
    throw new Error(String(output));
}
export function Dialog(title, message) {
    document.querySelector("#modalTitle").innerHTML = title;
    const text = typeof message === "string" ? message : JSON.stringify(message, undefined, 2);
    document.querySelector("#modalText").innerHTML = text;
    new bootstrap.Modal("#modal", {}).show();
}
export function Output(output) {
    const out = typeof output === "string" ? output : JSON.stringify(output, undefined, 2);
    document.querySelector("#output").innerText = out;
    document.querySelector("#outputBox").classList.remove("d-none");
    document.querySelector("#outputBox").scrollIntoView({ behavior: "smooth", inline: "nearest" });
}
//# sourceMappingURL=prompt.js.map