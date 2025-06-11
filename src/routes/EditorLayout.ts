import { type Config } from "../lib/schemas";
import { type ConfigManager } from "../lib/configmanager/ConfigManager";
import { writable, type Writable } from "svelte/store";

export const compatible_config_types: Writable<string[]> = writable([]);

export const selected_config: Writable<Config | undefined> = writable();

export const show_supported_only: Writable<boolean> = writable(false);

export const config_manager: Writable<ConfigManager | undefined> =
  writable(undefined);

export const selected_component_types: Writable<string[]> = writable([]);
