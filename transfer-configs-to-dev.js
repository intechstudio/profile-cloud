import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
} from "firebase/firestore/lite";
import { getAuth, signInAnonymously } from "firebase/auth";

// DEVELOPMENT
const devProfileCloudConfig = {
  apiKey: "AIzaSyB-Q0lvMOSLrtRNGom2FwI-80eCqx7fUpE",
  authDomain: "profile-cloud-dev.firebaseapp.com",
  projectId: "profile-cloud-dev",
  storageBucket: "profile-cloud-dev.appspot.com",
  messagingSenderId: "890246226184",
  appId: "1:890246226184:web:cd95540311613bb32eccbd",
  measurementId: "G-KQ27NWT6VF",
};

// PRODUCTION
const prodProfileCloudConfig = {
  apiKey: "AIzaSyA8qCcCpP6wwQMbcm1jAKle234_s4Waslk",
  authDomain: "profile-cloud.firebaseapp.com",
  projectId: "profile-cloud",
  storageBucket: "profile-cloud.appspot.com",
  messagingSenderId: "420254436941",
  appId: "1:420254436941:web:a8ef30f1bad7d4c2085604",
  measurementId: "G-2CZKVLCGJJ",
};

async function transferConfigsToDev() {
  const prodFirebaseApp = initializeApp(
    prodProfileCloudConfig,
    "prod-profile-cloud",
  );
  const prodFirestore = getFirestore(prodFirebaseApp);
  let prodConfigs = collection(prodFirestore, "configs");
  let q = query(prodConfigs, where("public", "==", true));
  let result = await getDocs(q);
  let docs = result.docs;

  const devFirebaseApp = initializeApp(
    devProfileCloudConfig,
    "dev-profile-cloud",
  );
  const devFirestore = getFirestore(devFirebaseApp);
  const devAuth = getAuth(devFirebaseApp);

  let user = await signInAnonymously(devAuth);

  docs.forEach(async (docSnapshot) => {
    await setDoc(
      doc(devFirestore, "configs", docSnapshot.id),
      docSnapshot.data(),
    );
  });

  // copy users from prod to dev
  const prodUsers = collection(prodFirestore, "users");
  const usersResult = await getDocs(prodUsers);
  await Promise.all(
    usersResult.docs.map((docSnapshot) =>
      setDoc(doc(devFirestore, "users", docSnapshot.id), docSnapshot.data()),
    ),
  );
}

transferConfigsToDev();
