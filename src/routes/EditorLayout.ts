import { type ConfigManager, createConfigManager } from "$lib/configmanager/ConfigManager";
import { type Config } from "$lib/schemas";
import { writable, type Writable } from "svelte/store";

export const compatible_config_types: Writable<string[]> = writable([]);

export const selected_config: Writable<string | undefined> = writable();

export const show_supported_only: Writable<boolean> = writable(false);

export const config_manager: Writable<ConfigManager | undefined> = writable(undefined);
