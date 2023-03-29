import { writable } from "svelte/store";


function createProfileStore() {
    const { subscribe, set, update } = writable({});
    return {
        subscribe,
        set,
        update,
    };
}

export const profileStore = createProfileStore();
