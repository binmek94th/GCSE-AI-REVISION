import 'server-only';
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

interface FirebaseServiceAccountJSON {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
}

if (!admin.apps.length) {
    let serviceAccount: FirebaseServiceAccountJSON | null = null;

    if (process.env.NODE_ENV === "development") {
        const filePath = path.join(process.cwd(), "src", "lib", "firebase-admin.json");
        console.log(`Firebase admin service account: ${filePath}`);

        if (!fs.existsSync(filePath)) {
            throw new Error(
                `Missing firebase-admin.json at ${filePath}. Please add your service account file.`
            );
        }

        serviceAccount = JSON.parse(fs.readFileSync(filePath, "utf8"));
        console.log("🔥 Using local firebase-admin.json for Firebase Admin");

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'gcse-ai-revision.firebasestorage.app',
        });
    } else {
        // Production environment
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (!serviceAccountKey) {
            throw new Error(
                'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set in production'
            );
        }

        try {
            serviceAccount = JSON.parse(serviceAccountKey);

            // Validate that we have the required fields
            if (!serviceAccount?.project_id || !serviceAccount?.private_key || !serviceAccount?.client_email) {
                throw new Error('Invalid service account JSON structure');
            }

            console.log("🔥 Initializing Firebase Admin in production");

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'gcse-ai-revision.firebasestorage.app',
            });

            console.log("✅ Firebase Admin initialized successfully");
        } catch (error) {
            console.error('Failed to parse or initialize Firebase Admin:', error);
            throw new Error('Firebase Admin initialization failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }
} else {
    console.log("ℹ️ Firebase Admin already initialized");
}

export default admin;