import { Response } from "express";
import * as admin from "firebase-admin";
import { onRequest, Request } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { SecretParam } from "firebase-functions/lib/params/types";
const intechstudioApiKey = defineSecret("X-INTECHSTUDIO-KEY");
admin.initializeApp();
const db = admin.firestore();

// Helper function to validate API key
function validateApiKey(
  req: Request,
  res: Response,
  apiKeySecret: SecretParam,
) {
  // Get the API key from request headers
  const requestApiKey =
    req.headers["x-intechstudio-key"] ||
    req.get("Authorization")?.replace("Bearer ", "");

  // Get the expected API key from secret
  const expectedApiKey = apiKeySecret.value();

  // If API key doesn't match, return unauthorized
  if (requestApiKey !== expectedApiKey) {
    res.status(403).json({ error: "Unauthorized: Invalid API key" });
    return false;
  }

  return true;
}

export const readAllProfiles = onRequest(
  { secrets: [intechstudioApiKey] },
  (req, res) => {
    // todo in future: limit, orderby, where

    if (!validateApiKey(req, res, intechstudioApiKey)) {
      return;
    }

    db.collection("configs")
      .where("public", "==", true)
      .get()
      .then((snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data());
        res.json(data);
      })
      .catch((err) => {
        res.json({ message: "error", error: err });
      });
  },
);

export const readUserProfiles = onRequest(
  { secrets: [intechstudioApiKey] },
  (req, res) => {
    if (!validateApiKey(req, res, intechstudioApiKey)) {
      return;
    }

    const userId = req.query.userId || req.body.userId;

    if (!userId) {
      res.status(400).json({ message: "userId is required" });
    }

    db.collection("configs")
      .where("owner", "==", userId)
      .where("public", "==", true)
      .get()
      .then((snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data());
        res.json(data);
      })
      .catch((err) => {
        res.status(500).json({ message: "error", error: err.message });
      });
  },
);

export const readSingleProfile = onRequest(
  { secrets: [intechstudioApiKey] },
  (req, res) => {
    if (!validateApiKey(req, res, intechstudioApiKey)) {
      return;
    }

    const profileId = req.query.profileId || req.body.profileId;

    console.log(profileId);

    db.collection("configs")
      .where("id", "==", profileId)
      .where("public", "==", true)
      .get()
      .then((snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data());
        if (data.length === 0) {
          res.json({ message: "no profile found" });
        }
        // return single item
        res.json(data[0]);
      })
      .catch((err) => {
        res.json({ message: "error", error: err });
      });
  },
);
