export function Prompt(
    id: string, 
    ask: string): string {
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
    set: Set<number>|undefined = undefined): number {
        const input = document.querySelector<HTMLInputElement>("#" + id);
        const result = input ? parseInt(input.value) : parseInt(window.prompt(ask) || "");
        if (isNaN(result)) {
            Fail(id, "Not a valid number");
        }
        if (result < min || result > max) {
            Fail(id, "Number " + result + " must be between " + min + " and " + max);
        }
        if (set && !set.has(result)) {
            Fail(id, "Number " + result + " must be one of " + Array.from(set).join(", "));
        }
        return result
}

export function Fail<T>(id: string, output: T) {
    console.error(output);
    const input = document.querySelector<HTMLInputElement>("#" + id);
    if (input) {
        input.classList.add("is-invalid");
        const feedback = input.parentElement?.getElementsByClassName("invalid-feedback");
        if (feedback?.length) {
            (<HTMLElement>feedback[0]).innerText = String(output);
        }
    } else {
        Output(output);
    }
    throw new Error("Stopped execution.");
}

export function Output<T>(output: T) {
    const out = typeof output === "string" ? output : JSON.stringify(output, undefined, 2);
    document.querySelector<HTMLInputElement>("#output")!.innerText = out;
    document.querySelector("#outputBox")!.classList.remove("d-none");
    document.querySelector("#outputBox")!.scrollIntoView({ behavior: "smooth", inline: "nearest" });
}
