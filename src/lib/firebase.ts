// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyA8qCcCpP6wwQMbcm1jAKle234_s4Waslk",
    authDomain: "profile-cloud.firebaseapp.com",
    projectId: "profile-cloud",
    storageBucket: "profile-cloud.appspot.com",
    messagingSenderId: "420254436941",
    appId: "1:420254436941:web:a8ef30f1bad7d4c2085604",
    measurementId: "G-2CZKVLCGJJ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
//connectFirestoreEmulator(db, 'localhost', 8080);

