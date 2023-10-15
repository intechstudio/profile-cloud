import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();
const db = admin.firestore();

export const readAllProfiles = functions.https.onRequest((req, res) => {
    // todo in future: limit, orderby, where
    db.collection("configs")
        .where("public", "==", true)
        .get()
        .then((snapshot) => {
            const data = snapshot.docs.map((doc) => doc.data());
            res.json(data);
        })
        .catch((err) => {
            res.json({message: "error", error: err});
        });
});

export const readSingleProfile = functions.https.onRequest((req, res) => {
    db.collection("configs")
        .where("id", "==", req.body.id)
        .where("public", "==", true)
        .get()
        .then((snapshot) => {
            const data = snapshot.docs.map((doc) => doc.data());
            if (data.length === 0) {
                res.json({message: "no profile found"});
            }
            // return single item
            res.json(data[0]);
        })
        .catch((err) => {
            res.json({message: "error", error: err});
        });
});
