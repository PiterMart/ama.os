import admin from "firebase-admin";
import fs from "fs";
import path from "path";

let serviceAccount;

if (process.env.NODE_ENV === "development") {
  const filePath = path.join(process.cwd(), "secrets", "ama-os-firebase-adminsdk-fbsvc-9d66aee58e.json");
  const fileData = fs.readFileSync(filePath, "utf8");
  serviceAccount = JSON.parse(fileData);
} else {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey ? privateKey.replace(/\\n/g, '\n') : undefined,
  };
  // Don't log service account with private key for security
  console.log("Service Account initialized for project:", serviceAccount.projectId);
}

if (!admin.apps || !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb };