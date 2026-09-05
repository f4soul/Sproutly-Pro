import { logger } from '../lib/logger';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { initializeFirestore, setLogLevel, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import defaultPlatformConfig from '../../firebase-applet-config.json';

// Silence internal Firestore SDK logs (suppresses "Could not reach Cloud Firestore backend" offline notices)
setLogLevel('silent');

// Intercept benign offline notices from Firestore in the browser environment
if (typeof window !== 'undefined' && window.console) {
  const originalError = window.console.error;
  window.console.error = (...args: unknown[]) => {
    const firstArg = typeof args[0] === 'string' ? args[0] : '';
    if (
      firstArg.includes('Could not reach Cloud Firestore backend') ||
      firstArg.includes('@firebase/firestore')
    ) {
      // Benign offline state notice when operating offline in Dexie local-first mode
      return;
    }
    originalError.apply(window.console, args);
  };
}

const customConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)",
};

export const firebaseConfig = import.meta.env.VITE_FIREBASE_API_KEY ? customConfig : defaultPlatformConfig;

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Auth helpers
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);


export const getFirebaseMessaging = async () => {
  if (await isSupported()) {
    return getMessaging(app);
  }
  return null;
};

export { onAuthStateChanged, doc, getDoc, setDoc, onSnapshot };
export type { User };
