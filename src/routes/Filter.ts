import { type Writable, writable } from "svelte/store";
import { type Config } from "../lib/schemas";
import { grid } from "@intechstudio/grid-protocol";

export function stringToTerms(value: string, wholeMatch: boolean, caseMatch: boolean) {
    const terms: Term[] = [];

    //Split into meaningful substrings. Delimiter is space.
    const parts = value.match(/\S+/g) || [];

    for (const part of parts) {
        terms.push({
            value: part,
            wholeMatch: wholeMatch,
            caseMatch: caseMatch
        });
    }
    return terms;
}

export type Term = {
    value: string;
    wholeMatch: boolean;
    caseMatch: boolean;
};

export class FilterValue extends Array<Term> {
    constructor(...terms: Term[]) {
        super(...terms);
    }

    // Helper function to compare two objects dynamically
    private areObjectsEqual(obj1: Record<string, unknown>, obj2: Record<string, unknown>): boolean {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        // Check if both objects have the same number of keys
        if (keys1.length !== keys2.length) {
            return false;
        }

        // Check if all keys and values are equal
        for (const key of keys1) {
            if (obj1[key] !== obj2[key]) {
                return false;
            }
        }

        return true;
    }

    // Method to compare if two FilterValue instances are equal
    isEqual(other: FilterValue): boolean {
        // If the lengths of the arrays differ, they are not equal
        if (this.length !== other.length) return false;

        // Compare each term in the array
        for (let i = 0; i < this.length; i++) {
            const term1 = this[i];
            const term2 = other[i];

            // Use the helper function to compare the two Term objects
            if (!this.areObjectsEqual(term1, term2)) {
                return false;
            }
        }

        // If all terms match, the FilterValue instances are equal
        return true;
    }
}

export const filter_value: Writable<FilterValue> = writable(new FilterValue());

export function filterConfigs(configs: Config[], filter: FilterValue): Config[] {
    // Helper function to check if a value matches the term
    const matchesTerm = (value: string | undefined, term: Term): boolean => {
        if (value === undefined) return false;

        const searchValue = term.caseMatch ? value : value.toLowerCase();
        const termValue = term.caseMatch ? term.value : term.value.toLowerCase();

        return term.wholeMatch ? searchValue === termValue : searchValue.includes(termValue);
    };

    if (filter.length === 0) {
        return configs;
    }

    return configs.filter((config) => {
        // Get scripts from Presets/Profiles
        let scripts: string[] = [];
        switch (config.configType) {
            case "preset": {
                scripts = config.configs.events.map((e: any) => e.config);
                break;
            }
            case "profile": {
                for (const element of config.configs) {
                    scripts.push(...element.events.map((e: any) => e.config));
                }
                break;
            }
        }

        // Regular expression to match --[[@<any string>]]
        const regex = /--\[\[@(.*?)\]\]/g;

        // Extract all unique shorts from scripts
        const shorts = Array.from(
            new Set(
                scripts.flatMap((str) => {
                    const matches = str.matchAll(regex); // Get all matches
                    return Array.from(matches, (match) => match[1]); // Extract matched strings
                })
            )
        );

        const searchables = [
            config.name,
            config.type,
            config.configType,
            config.virtualPath
        ].filter((field): field is string => field !== undefined);

        // Check if any term matches any searchable field
        return filter.every((term) => {
            if (term.value.startsWith("$")) {
                const blockNames = shorts.map((e) =>
                    grid.ActionBlock.shortToDisplayName(e)
                        ?.replaceAll(" ", "")
                        .replaceAll("$", "And")
                );
                return blockNames.some((e) =>
                    matchesTerm(e, {
                        value: term.value.slice(1, term.value.length),
                        caseMatch: false,
                        wholeMatch: false
                    })
                );
            } else {
                return searchables.some((searchable) => matchesTerm(searchable, term));
            }
        });
    });
}
