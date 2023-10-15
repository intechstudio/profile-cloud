import {scheduledFirestoreExport as SFE} from "./firestoreBackup";
import {
    readAllProfiles as RAP,
    readSingleProfile as RSP,
} from "./publicCloudQueries";

// this is just sad. should learn how to import and export properly
export const scheduledFirestoreExport = SFE;
export const readAllProfiles = RAP;
export const readSingleProfile = RSP;
