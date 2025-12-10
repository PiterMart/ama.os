import admin from "firebase-admin";
import fs from "fs";
import path from "path";

let _adminAuth = null;
let _adminDb = null;
let initialized = false;

function initializeAdmin() {
  if (initialized || admin.apps.length > 0) {
    return;
  }

  let serviceAccount;

  if (process.env.NODE_ENV === "development") {
    const filePath = path.join(process.cwd(), "secrets", "ama-os-firebase-adminsdk-fbsvc-9d66aee58e.json");
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf8");
      serviceAccount = JSON.parse(fileData);
    } else {
      // During build, file might not exist - skip initialization
      return;
    }
  } else {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    // During build, environment variables might not be available - skip initialization
    if (!projectId || !clientEmail || !privateKey) {
      return;
    }
    
    // Handle different private key formats
    let formattedPrivateKey = privateKey;
    
    // If the key contains literal \n (escaped newlines), replace them with actual newlines
    if (formattedPrivateKey.includes('\\n')) {
      formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
    }
    
    // Ensure the key has proper BEGIN/END markers
    const hasBeginMarker = formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----');
    const hasEndMarker = formattedPrivateKey.includes('-----END PRIVATE KEY-----');
    
    if (!hasBeginMarker || !hasEndMarker) {
      // Remove any existing markers first to avoid duplication
      formattedPrivateKey = formattedPrivateKey
        .replace(/-----BEGIN PRIVATE KEY-----\n?/g, '')
        .replace(/-----END PRIVATE KEY-----\n?/g, '')
        .trim();
      
      // Add proper markers
      formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----`;
    }
    
    serviceAccount = {
      projectId,
      clientEmail,
      privateKey: formattedPrivateKey,
    };
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    _adminAuth = admin.auth();
    _adminDb = admin.firestore();
    initialized = true;
  } catch (error) {
    if (error.message && (error.message.includes('private key') || error.message.includes('ASN.1'))) {
      const errorDetails = `\n\nError details: ${error.message}\n` +
        `Project ID: ${serviceAccount.projectId ? 'Set' : 'Missing'}\n` +
        `Client Email: ${serviceAccount.clientEmail ? 'Set' : 'Missing'}\n` +
        `Private Key: ${serviceAccount.privateKey ? `Present (${serviceAccount.privateKey.length} chars)` : 'Missing'}\n` +
        `\nPlease ensure FIREBASE_PRIVATE_KEY in Vercel includes:\n` +
        `- The full key with -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----\n` +
        `- Newlines escaped as \\n (backslash followed by n)\n` +
        `- Example format: "-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----"`;
      throw new Error(`Failed to parse Firebase private key.${errorDetails}`);
    }
    throw error;
  }
}

// Lazy initialization getters
const getAdminAuth = () => {
  initializeAdmin();
  if (!_adminAuth) {
    throw new Error('Firebase Admin is not initialized. Please check your environment variables or local secrets file.');
  }
  return _adminAuth;
};

const getAdminDb = () => {
  initializeAdmin();
  if (!_adminDb) {
    throw new Error('Firebase Admin is not initialized. Please check your environment variables or local secrets file.');
  }
  return _adminDb;
};

// Export properties that initialize on access
export const adminAuth = new Proxy({}, {
  get(target, prop) {
    const auth = getAdminAuth();
    const value = auth[prop];
    return typeof value === 'function' ? value.bind(auth) : value;
  }
});

export const adminDb = new Proxy({}, {
  get(target, prop) {
    const db = getAdminDb();
    const value = db[prop];
    return typeof value === 'function' ? value.bind(db) : value;
  }
});