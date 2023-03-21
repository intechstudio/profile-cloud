import { writable } from "svelte/store";
import { db } from "./firebase";

function createProfileStore() {
    const { subscribe, set, update } = writable({});


    return {
        subscribe,
        set,
        update,
    };
}

export const profileStore = createProfileStore();