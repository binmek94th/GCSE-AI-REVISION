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
    }
    else {
        const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!key) {
            throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment variables.");
        }

        try {
            // Replace escaped \n with real newlines
            serviceAccount = JSON.parse(key.replace(/\\n/g, "\n"));
            console.log("🚀 Using FIREBASE_SERVICE_ACCOUNT_KEY from environment");
        } catch (error) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error);
            throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON.");
        }
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
}

export default admin;
