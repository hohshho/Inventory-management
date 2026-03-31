import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

type PublicFirebaseConfig = {
  apiKey: string | undefined;
  authDomain: string | undefined;
  projectId: string | undefined;
  storageBucket: string | undefined;
  messagingSenderId: string | undefined;
  appId: string | undefined;
  measurementId: string | undefined;
};

function getSelectedAppEnv() {
  return process.env.NEXT_PUBLIC_APP_ENV === "production" ? "production" : "development";
}

function getSelectedFirebaseConfig(): PublicFirebaseConfig {
  const selectedEnv = getSelectedAppEnv();

  const scopedConfig =
    selectedEnv === "production"
      ? {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY_PROD,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_PROD,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID_PROD,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_PROD,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_PROD,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID_PROD,
          measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID_PROD,
        }
      : {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY_DEV,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID_DEV,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_DEV,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_DEV,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID_DEV,
          measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID_DEV,
        };

  if (scopedConfig.apiKey && scopedConfig.authDomain && scopedConfig.projectId && scopedConfig.appId) {
    return scopedConfig;
  }

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

const firebaseConfig = getSelectedFirebaseConfig();

const hasFirebaseConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
].every(Boolean);

const app =
  hasFirebaseConfig
    ? getApps().length
      ? getApp()
      : initializeApp(firebaseConfig)
    : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const isFirebaseConfigured = hasFirebaseConfig;
export const firebaseAppEnv = getSelectedAppEnv();
