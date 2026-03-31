import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

type ServiceAccountShape = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type SelectedAdminConfig = {
  appEnv: "development" | "production";
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  serviceAccountPath?: string;
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../../..");

function getSelectedAppEnv() {
  return process.env.APP_ENV === "production" ? "production" : "development";
}

function getSelectedAdminConfig(): SelectedAdminConfig {
  const appEnv = getSelectedAppEnv();

  const scopedConfig =
    appEnv === "production"
      ? {
          projectId: process.env.FIREBASE_PROJECT_ID_PROD,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL_PROD,
          privateKey: process.env.FIREBASE_PRIVATE_KEY_PROD?.replace(/\\n/g, "\n"),
          serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH_PROD,
        }
      : {
          projectId: process.env.FIREBASE_PROJECT_ID_DEV,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL_DEV,
          privateKey: process.env.FIREBASE_PRIVATE_KEY_DEV?.replace(/\\n/g, "\n"),
          serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH_DEV,
        };

  if (
    scopedConfig.projectId ||
    scopedConfig.clientEmail ||
    scopedConfig.privateKey ||
    scopedConfig.serviceAccountPath
  ) {
    return {
      appEnv,
      ...scopedConfig,
    };
  }

  return {
    appEnv,
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  };
}

function resolveServiceAccountPath(config: SelectedAdminConfig) {
  if (config.serviceAccountPath) {
    return path.resolve(repoRoot, config.serviceAccountPath);
  }

  const candidates =
    config.appEnv === "production"
      ? ["secret/firebase.prod.json"]
      : ["secret/firebase.dev.json", "secret/inventory-management-key.json"];

  for (const candidate of candidates) {
    const resolved = path.resolve(repoRoot, candidate);

    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  return null;
}

function createCredential(config: SelectedAdminConfig) {
  if (config.projectId && config.clientEmail && config.privateKey) {
    return cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    });
  }

  const serviceAccountPath = resolveServiceAccountPath(config);

  if (serviceAccountPath) {
    const file = fs.readFileSync(serviceAccountPath, "utf8");
    const serviceAccount = JSON.parse(file) as ServiceAccountShape;

    return cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    });
  }

  return applicationDefault();
}

const selectedConfig = getSelectedAdminConfig();

const adminApp =
  getApps()[0] ??
  initializeApp({
    credential: createCredential(selectedConfig),
    projectId: selectedConfig.projectId,
  });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const firebaseAppEnv = selectedConfig.appEnv;
