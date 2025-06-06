import * as firestore from "@google-cloud/firestore";
import { onSchedule } from "firebase-functions/scheduler";

const bucket = "gs://profile-cloud-firestore-backup";
const client = new firestore.v1.FirestoreAdminClient();
const projectId = process.env.GCP_PROJECT || "profile-cloud";

export const scheduledFirestoreExport = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "Europe/Zurich",
    region: "europe-west3",
  },
  async (event) => {
    const databaseName = client.databasePath(projectId, "(default)");

    try {
      const [response] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: bucket,
        // Leave collectionIds empty to export all collections
        // or set to a list of collection IDs to export,
        // collectionIds: ['users', 'posts']
        collectionIds: [],
      });
      console.log(`Operation Name: ${response.name}`);
    } catch (err) {
      console.error(err);
      throw new Error("Export operation failed");
    }
  }
);