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
    });
    }
    else {
        serviceAccount = JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
        );

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });
    }
}
    // }

export default admin;
