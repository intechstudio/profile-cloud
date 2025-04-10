import * as functions from "firebase-functions";
import * as firestore from "@google-cloud/firestore";
const client = new firestore.v1.FirestoreAdminClient();

// Replace BUCKET_NAME
const bucket = "gs://profile-cloud-firestore-backup";

export const scheduledFirestoreExport = functions
  .region("europe-west3")
  .pubsub.schedule("every 24 hours")
  .timeZone("Europe/Zurich")
  .onRun((context) => {
    const projectId = process.env.GCP_PROJECT || "profile-cloud";
    const databaseName = client.databasePath(projectId, "(default)");
    return client
      .exportDocuments({
        name: databaseName,
        outputUriPrefix: bucket,
        // Leave collectionIds empty to export all collections
        // or set to a list of collection IDs to export,
        // collectionIds: ['users', 'posts']
        collectionIds: [],
      })
      .then((responses) => {
        const response = responses[0];
        console.log(`Operation Name: ${response["name"]}`);
      })
      .catch((err) => {
        console.error(err);
        throw new Error("Export operation failed");
      });
  });
