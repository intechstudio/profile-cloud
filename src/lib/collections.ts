import { collection, type CollectionReference, type DocumentData } from "firebase/firestore";
import { firestore } from "./firebase";
import type { Profile, ProfileLink, Config, ConfigLink } from "./schemas";
// This is just a helper to add the type to the db responses
const createCollection = <T = DocumentData>(collectionName: string) => {
    return collection(firestore, collectionName) as CollectionReference<T>;
};

export const profilesCollection = createCollection<Profile>("profiles");
export const profileLinksCollection = createCollection<ProfileLink>("profileLinks");
export const configsCollection = createCollection<Config>("configs");
export const configLinksCollection = createCollection<ConfigLink>("configLinks");
export const userCollection = createCollection("users");
export const usernameCollection = createCollection("usernames");
