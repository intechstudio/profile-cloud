import { collection, type CollectionReference, type DocumentData } from "firebase/firestore";
import { firestore } from "./firebase";
import type { CloudConfig } from "./schemas";
// This is just a helper to add the type to the db responses
const createCollection = <T = DocumentData>(collectionName: string) => {
    return collection(firestore, collectionName) as CollectionReference<T>;
};

export const configsCollection = createCollection<CloudConfig>("configs");
export const userCollection = createCollection("users");
export const usernameCollection = createCollection("usernames");
