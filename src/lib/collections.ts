import { collection, type CollectionReference, type DocumentData } from "firebase/firestore";
import { firestore } from "./firebase";
import type { Profile, ProfileLink } from "./schemas";
// This is just a helper to add the type to the db responses
const createCollection = <T = DocumentData>(collectionName: string) => {
    return collection(firestore, collectionName) as CollectionReference<T>;
};

export const profilesCollection = createCollection<Profile>("profiles");
export const profileLinksCollection = createCollection<ProfileLink>("profileLinks");
export const configsCollection = createCollection<Profile>("configs");
export const configLinksCollection = createCollection<ProfileLink>("configLinks");
export const userCollection = createCollection("users");
export const usernameCollection = createCollection("usernames");
