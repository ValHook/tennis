export function Prompt(ask) {
    ask += " ";
    const result = (window.prompt(ask) || "").replace(/\s/g, "");
    if (!result.length) {
        Fail("Not a valid string");
    }
    return result;
}
export function PromptInt(ask, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, set = undefined) {
    ask += " ";
    const result = parseInt(window.prompt(ask) || "");
    if (isNaN(result)) {
        Fail("Not a valid number");
    }
    if (result < min) {
        Fail("Number must be >= " + min);
    }
    if (result > max) {
        Fail("Number must be <= " + max);
    }
    if (set && !set.has(result)) {
        Fail("Number must be one of " + Array.from(set).join(", "));
    }
    return result;
}
export function Fail(input) {
    console.error(input);
    const error = typeof input === "string" ? input : JSON.stringify(input, undefined, 2);
    document.getElementById("out").innerText = error;
    throw new Error("Stopped execution.");
}
