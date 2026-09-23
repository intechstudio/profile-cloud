import { type Config } from "../lib/schemas";
import { ElementType, ModuleType } from "@intechstudio/grid-protocol";
import { type ConfigManager } from "../lib/configmanager/ConfigManager";
import { writable, type Writable } from "svelte/store";

export const compatible_config_types: Writable<
  Array<ElementType | ModuleType>
> = writable([]);

export const selected_config: Writable<Config | undefined> = writable();

// Tracks which tree row is highlighted - a folder, a real top-level config,
// or a virtual preset/snippet nested under a profile. selected_config only
// ever holds a real, previewable config, so this is the only store that can
// represent "a folder/nested item is selected" for row highlighting and
// scroll-into-view purposes.
export const selected_node_id: Writable<string | undefined> = writable();

// Human-readable name for whatever selected_node_id points at (a folder's
// title, or a config's displayName/name), so the "no preview" placeholder
// can say what's selected instead of a generic message.
export const selected_node_label: Writable<string | undefined> = writable();

export function selectClosestMatch(
  target: Config | undefined,
  configs: Config[],
) {
  const current = configs.find((e) => e.id === target?.id);

  if (typeof current === "undefined") {
    const first = configs[0];
    selected_config.set(first);
    selected_node_id.set(first?.id);
    selected_node_label.set(first?.name);
  }
}

export const show_supported_only: Writable<boolean> = writable(false);
export const hide_community_configs: Writable<boolean> = writable(true);
export const config_manager: Writable<ConfigManager | undefined> =
  writable(undefined);

export const selected_component_types: Writable<string[]> = writable([]);
