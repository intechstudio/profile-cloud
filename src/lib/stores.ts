import { EmailAuthProvider, GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut, type User } from "firebase/auth";
import { writable } from "svelte/store";
import { firebaseAuth } from "./firebase";

function createUserAccountStore() {

    const { subscribe, set, update } = writable<{ account: User | null, credential?: null }>(
        { account: null },
        () => {
            return () => {
                // this function is called, when no more subscribers are listening to the store
                authChangeUnsubscribe()
            }
        });

    async function authenticateUser(credential: { event?: string, providerId?: string, idToken?: string, email?: string, password?: string }) {
        let cred;

        console.log('Authentication stuff from editor', credential)

        if (!credential || credential?.event == 'logout') {
            console.log('signing out')
            signOut(firebaseAuth);
            return;
        }

        if (credential.providerId == 'google.com') {
            cred = GoogleAuthProvider.credential(credential.idToken);
        } else if (credential.providerId == 'password') {
            cred = EmailAuthProvider.credential(credential.email!, credential.password!);
        }


        if (!cred) return;

        return await signInWithCredential(firebaseAuth, cred)
            .then((user) => {
                console.log('authenticated in profile cloud', user);
            })
            .catch((error) => {
                console.log(error);
            });
    }

    function logout() {
        signOut(firebaseAuth).then((res) => {
            set({ account: null })
        }).catch((error) => {
            console.log(error)
        })
    }

    // we must unsubscribe on store unsubscription from this as well!
    const authChangeUnsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
            set({ account: user })
            // User is signed in, see docs for a list of available properties
        } else {
            set({ account: null })
        }
    })

    return {
        subscribe,
        logout,
        authenticateUser
    }

}

function createProfileStore() {
    const { subscribe, set, update } = writable({});
    return {
        subscribe,
        set,
        update,
    };
}

export const userAccountStore = createUserAccountStore();
export const profileStore = createProfileStore();
