import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isConfigured = Object.values(firebaseConfig).every(Boolean);
let app;

export const isFirebaseReady = () => isConfigured;

export const ensureFirebase = () => {
  if (!isConfigured) {
    throw new Error('Firebase environment variables are missing. Add them to .env to enable backend sync.');
  }
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
};

export const getFirebaseAuth = () => getAuth(ensureFirebase());
export const getFirebaseDb = () => getFirestore(ensureFirebase());
export const getFirebaseStorage = () => getStorage(ensureFirebase());
