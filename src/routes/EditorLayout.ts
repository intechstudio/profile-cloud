import { writable, type Writable } from "svelte/store";

export const compatible_config_types: Writable<string[]> = writable([]);

export const selected_config: Writable<string | undefined> = writable();
