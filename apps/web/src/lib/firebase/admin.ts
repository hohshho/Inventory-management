import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

type AdminEnvConfig = {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
};

function getSelectedAppEnv() {
  return process.env.APP_ENV === "production" ? "production" : "development";
}

function getSelectedAdminConfig(): AdminEnvConfig {
  const selectedEnv = getSelectedAppEnv();

  const scopedConfig =
    selectedEnv === "production"
      ? {
          projectId: process.env.FIREBASE_PROJECT_ID_PROD,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL_PROD,
          privateKey: process.env.FIREBASE_PRIVATE_KEY_PROD?.replace(/\\n/g, "\n"),
        }
      : {
          projectId: process.env.FIREBASE_PROJECT_ID_DEV,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL_DEV,
          privateKey: process.env.FIREBASE_PRIVATE_KEY_DEV?.replace(/\\n/g, "\n"),
        };

  if (scopedConfig.projectId && scopedConfig.clientEmail && scopedConfig.privateKey) {
    return scopedConfig;
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };
}

function createCredential() {
  const config = getSelectedAdminConfig();

  if (config.projectId && config.clientEmail && config.privateKey) {
    return cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    });
  }

  return applicationDefault();
}

const selectedConfig = getSelectedAdminConfig();

const adminApp =
  getApps()[0] ??
  initializeApp({
    credential: createCredential(),
    projectId: selectedConfig.projectId,
  });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
