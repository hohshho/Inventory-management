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

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../../..");

function resolveServiceAccountPath() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return path.resolve(repoRoot, process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  }

  const defaultPath = path.resolve(repoRoot, "secret/inventory-management-key.json");
  return fs.existsSync(defaultPath) ? defaultPath : null;
}

function createCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return cert({
      projectId,
      clientEmail,
      privateKey,
    });
  }

  const serviceAccountPath = resolveServiceAccountPath();

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

const adminApp =
  getApps()[0] ??
  initializeApp({
    credential: createCredential(),
  });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
