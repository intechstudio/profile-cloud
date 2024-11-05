import { type ConfigManager } from "../lib/configmanager/ConfigManager";
import { writable, type Writable } from "svelte/store";

export const compatible_config_types: Writable<string[]> = writable([]);

export type ConfigSelection = { id: string; presetIndex: number };
export const selected_config: Writable<ConfigSelection | undefined> = writable();

export const show_supported_only: Writable<boolean> = writable(false);

export const config_manager: Writable<ConfigManager | undefined> = writable(undefined);

export const selected_component_types: Writable<string[]> = writable([]);
