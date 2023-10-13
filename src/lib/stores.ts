import {
    EmailAuthProvider,
    GoogleAuthProvider,
    OAuthProvider,
    onAuthStateChanged,
    signInWithCredential,
    signOut,
    type User
} from "firebase/auth";
import { writable } from "svelte/store";
import { firebaseAuth } from "./firebase";

import { PUBLIC_APP_ENV } from "$env/static/public";

function createUserAccountService() {
    const { subscribe, set, update } = writable<{ account: User | null; credential?: null }>(
        { account: null },
        () => {
            return () => {
                // this function is called, when no more subscribers are listening to the store
                authChangeUnsubscribe();
            };
        }
    );

    async function authenticateUser(credential: {
        event?: string;
        providerId?: string;
        idToken?: string;
        email?: string;
        password?: string;
        credential?: any;
    }) {
        let cred;

        if (!credential || credential?.event == "logout") {
            console.log("signing out");
            signOut(firebaseAuth);
            return;
        }
        const provider = new OAuthProvider(
            PUBLIC_APP_ENV === "production" ? "oidc.is-auth" : "oidc.is-auth-dev"
        );
        cred = provider.credential({
            idToken: credential.idToken
        });

        if (!cred) return;

        return await signInWithCredential(firebaseAuth, cred)
            .then((user) => {
                console.log("authenticated in profile cloud", user);
            })
            .catch((error) => {
                console.log("what is error", error);
            });
    }

    function logout() {
        signOut(firebaseAuth)
            .then((res) => {
                set({ account: null });
            })
            .catch((error) => {
                console.log(error);
            });
    }

    // we must unsubscribe on store unsubscription from this as well!
    const authChangeUnsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        console.log({user});
        if (user !== null || user !== undefined) {
            set({ account: user });
            // User is signed in, see docs for a list of available properties
        } else {
            set({ account: null });
        }
    });

    return {
        subscribe,
        logout,
        authenticateUser
    };
}

export const userAccountService = createUserAccountService();
