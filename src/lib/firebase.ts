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

const centralAuthConfig = {
    apiKey: "AIzaSyDla2zilILl5X0sQ4fbhAO61uFCqCoVhZc",
    authDomain: "is-auth-dev.firebaseapp.com",
    projectId: "is-auth-dev",
    storageBucket: "is-auth-dev.appspot.com",
    messagingSenderId: "610580654354",
    appId: "1:610580654354:web:d7dc9982f52ece959c2bcb"
};

// Initialize Firebase
const centralAuthApp = initializeApp(centralAuthConfig, 'central-auth');
export const centralAuth = getAuth(centralAuthApp);
export const firebaseApp = initializeApp(firebaseConfig, 'profile-cloud');
export const firebaseAnalytics = getAnalytics(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const firebaseAuth = getAuth(firebaseApp);
//connectFirestoreEmulator(db, 'localhost', 8080);

