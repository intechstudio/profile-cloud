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

export function sortConfigs(configs: Config[], key: Sort.Key): Config[] {
  const { type, direction } = key;
  const compareFieldsMap = new Map([
    [
      Sort.Type.NAME,
      (a: any, b: any) => {
        return a.name
          .toLowerCase()
          .localeCompare(b.name.toLowerCase(), undefined, { numeric: true });
      },
    ],
    [
      Sort.Type.TYPE,
      (a: any, b: any) => {
        return a.type.localeCompare(b.type, undefined, {
          numeric: true,
        });
      },
    ],
    [
      Sort.Type.DATE,
      (a: any, b: any) => {
        return a.modifiedAt - b.modifiedAt;
      },
    ],
  ]);

  configs.sort(compareFieldsMap.get(type));

  if (direction === Sort.Direction.DESC) {
    configs.reverse();
  }

  return configs;
}
