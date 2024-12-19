import { writable, type Writable } from "svelte/store";

export const dragTarget: Writable<any> = writable();
