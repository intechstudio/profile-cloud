// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

import { PUBLIC_APP_ENV } from '$env/static/public';


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// DEVELOPMENT
const devProfileCloudConfig = {
    apiKey: "AIzaSyB-Q0lvMOSLrtRNGom2FwI-80eCqx7fUpE",
    authDomain: "profile-cloud-dev.firebaseapp.com",
    projectId: "profile-cloud-dev",
    storageBucket: "profile-cloud-dev.appspot.com",
    messagingSenderId: "890246226184",
    appId: "1:890246226184:web:cd95540311613bb32eccbd",
    measurementId: "G-KQ27NWT6VF"
};

// PRODUCTION
const prodProfileCloudConfig = {
    apiKey: "AIzaSyA8qCcCpP6wwQMbcm1jAKle234_s4Waslk",
    authDomain: "profile-cloud.firebaseapp.com",
    projectId: "profile-cloud",
    storageBucket: "profile-cloud.appspot.com",
    messagingSenderId: "420254436941",
    appId: "1:420254436941:web:a8ef30f1bad7d4c2085604",
    measurementId: "G-2CZKVLCGJJ"
};

const profileCloudConfig = PUBLIC_APP_ENV === 'production' ? prodProfileCloudConfig : devProfileCloudConfig;

export const firebaseApp = initializeApp(profileCloudConfig, 'profile-cloud');
export const firebaseAnalytics = getAnalytics(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const firebaseAuth = getAuth(firebaseApp);
//connectFirestoreEmulator(db, 'localhost', 8080);

