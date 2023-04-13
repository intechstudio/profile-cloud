import type { User } from "firebase/auth";
import { writable } from "svelte/store";

function createFirebaseUserStore() {
    const { subscribe, set, update } = writable<User | null>(null);

    return {
        subscribe,
        set,
        update,
    };
}

function createProfileStore() {
    const { subscribe, set, update } = writable({});
    return {
        subscribe,
        set,
        update,
    };
}

export const firebaseUserStore = createFirebaseUserStore();
export const profileStore = createProfileStore();
