export function Prompt(ask) {
    const result = (window.prompt(ask) || "").replace(/\s/g, "");
    if (!result.length) {
        Fail("Not a valid string");
    }
    return result;
}
export function PromptInt(ask, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, set = undefined) {
    const result = parseInt(window.prompt(ask) || "");
    if (isNaN(result)) {
        Fail("Not a valid number");
    }
    if (result < min || result > max) {
        Fail("Number " + result + " must be >= " + min + " and <= " + max);
    }
    if (set && !set.has(result)) {
        Fail("Number " + result + " must be one of " + Array.from(set).join(", "));
    }
    return result;
}
export function Fail(output) {
    console.error(output);
    Output(output);
    throw new Error("Stopped execution.");
}
export function Output(output) {
    const out = typeof output === "string" ? output : JSON.stringify(output, undefined, 2);
    document.getElementById("output").innerText = out;
    document.getElementById("outputBox").classList.remove("d-none");
    document.getElementById("outputBox").scrollIntoView({ behavior: "smooth", inline: "nearest" });
}
//# sourceMappingURL=prompt.js.map