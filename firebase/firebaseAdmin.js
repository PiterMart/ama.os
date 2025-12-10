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
  
  // Handle different private key formats
  let formattedPrivateKey = undefined;
  if (privateKey) {
    // Replace escaped newlines with actual newlines (common in env variables)
    formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    
    // Remove any existing BEGIN/END markers to avoid duplication
    formattedPrivateKey = formattedPrivateKey.replace(/-----BEGIN PRIVATE KEY-----\n?/g, '');
    formattedPrivateKey = formattedPrivateKey.replace(/-----END PRIVATE KEY-----\n?/g, '');
    
    // Clean up any extra whitespace/newlines
    formattedPrivateKey = formattedPrivateKey.trim();
    
    // Add proper BEGIN/END markers with correct formatting
    formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----`;
  }
  
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: formattedPrivateKey,
  };
  
  // Validate that all required fields are present
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Missing required Firebase Admin environment variables. Please check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
  }
}

if (!admin.apps || !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    if (error.message && error.message.includes('private key')) {
      throw new Error(
        'Failed to parse Firebase private key. Please ensure FIREBASE_PRIVATE_KEY is set correctly in your environment variables. ' +
        'The key should include the full content between -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----, ' +
        'with newlines escaped as \\n in the environment variable.'
      );
    }
    throw error;
  }
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb };