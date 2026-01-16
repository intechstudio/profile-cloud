import { type Config } from "../lib/schemas";
import { ElementType, ModuleType } from "@intechstudio/grid-protocol";
import { type ConfigManager } from "../lib/configmanager/ConfigManager";
import { writable, type Writable } from "svelte/store";

export const compatible_config_types: Writable<
  Array<ElementType | ModuleType>
> = writable([]);

export const selected_config: Writable<Config | undefined> = writable();

export function selectClosestMatch(
  target: Config | undefined,
  configs: Config[],
) {
  const current = configs.find((e) => e.id === target?.id);

  if (typeof current === "undefined") {
    const first = configs[0];
    selected_config.set(first);
  }
}

export const show_supported_only: Writable<boolean> = writable(false);
export const hide_community_configs: Writable<boolean> = writable(true);
export const config_manager: Writable<ConfigManager | undefined> =
  writable(undefined);

export const selected_component_types: Writable<string[]> = writable([]);
