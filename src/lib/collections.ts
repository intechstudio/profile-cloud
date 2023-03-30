import { collection, type CollectionReference, type DocumentData } from "firebase/firestore"
import { db } from "./firebase"
import type { Profile } from "./types"
// This is just a helper to add the type to the db responses
const createCollection = <T = DocumentData>(collectionName: string) => {
    return collection(db, collectionName) as CollectionReference<T>
}

export const profilesCollection = createCollection<Profile>("profiles")