import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
    if (getApps().length === 0) {
        return initializeApp(firebaseConfig);
    }
    return getApps()[0];
}

export function getAuthInstance(): Auth {
    return getAuth(getFirebaseApp());
}

export function getDbInstance(): Firestore {
    return getFirestore(getFirebaseApp());
}

export const auth = typeof window !== 'undefined' ? getAuth(getFirebaseApp()) : null as any;
export const db = typeof window !== 'undefined' ? getFirestore(getFirebaseApp()) : null as any;