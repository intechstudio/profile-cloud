import { type Config } from "../lib/schemas";
import { type Writable, writable } from "svelte/store";

export namespace Sort {
  export enum Type {
    NAME = "Name",
    DATE = "Date",
    TYPE = "Type",
  }

  export enum Direction {
    ASC = "Ascending",
    DESC = "Descending",
  }

  export type Key = {
    type: Type;
    direction: Direction;
  };

  export const DefaultValue: Key = {
    type: Type.DATE,
    direction: Direction.DESC,
  };
}

export const sort_key: Writable<Sort.Key> = writable(Sort.DefaultValue);
