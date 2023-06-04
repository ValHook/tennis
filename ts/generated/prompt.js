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
export function Fail(input) {
    console.error(input);
    const error = typeof input === "string" ? input : JSON.stringify(input, undefined, 2);
    document.getElementById("out").innerText = error;
    throw new Error("Stopped execution.");
}
//# sourceMappingURL=prompt.js.map