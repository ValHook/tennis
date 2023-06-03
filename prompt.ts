import PromptSync from "prompt-sync";

const PROMPTER = PromptSync({sigint: true});

export function Prompt(ask: string){
    ask += " ";
    const result = PROMPTER({ask}).replace(/\s/g, "");
    if (!result.length) {
        throw new Error("Not a valid string");
    }
    return result;
}

export function PromptInt(
    ask: string,
    min: number = Number.MIN_SAFE_INTEGER,
    max: number = Number.MAX_SAFE_INTEGER,
    set: Set<number>|undefined = undefined) {
        ask += " ";
        const result = parseInt(PROMPTER({ask}));
        if (isNaN(result)) {
            throw new Error("Not a valid number");
        }
        if (result < min) {
            throw new Error("Number must be >= " + min);
        }
        if (result > max) {
            throw new Error("Number must be <= " + max);
        }
        if (set && !set.has(result)) {
            throw new Error("Number must be one of " + Array.from(set).join(", "));
        }
        return result
}