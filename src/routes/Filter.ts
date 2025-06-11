import { type Writable, writable } from "svelte/store";
import { type Config } from "../lib/schemas";
import { grid } from "@intechstudio/grid-protocol";

export function stringToTerms(
  value: string,
  wholeMatch: boolean,
  caseMatch: boolean,
) {
  const terms: Term[] = [];

  //Split into meaningful substrings. Delimiter is space.
  const parts = value.match(/\S+/g) || [];

  for (const part of parts) {
    terms.push({
      value: part,
      wholeMatch: wholeMatch,
      caseMatch: caseMatch,
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
  private areObjectsEqual(
    obj1: Record<string, unknown>,
    obj2: Record<string, unknown>,
  ): boolean {
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
