import 'server-only';
import admin from "firebase-admin";

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
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
        throw new Error(
            'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. ' +
            'Please add it to your .env.local file.'
        );
    }

    let serviceAccount: FirebaseServiceAccountJSON;
    try {
        serviceAccount = JSON.parse(serviceAccountKey);
    } catch (error) {
        throw new Error(
            'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. ' +
            'Make sure it\'s valid JSON.'
        );
    }

    if (!serviceAccount.project_id) {
        throw new Error(
            'FIREBASE_SERVICE_ACCOUNT_KEY is missing project_id. ' +
            'Make sure you copied the entire service account JSON.'
        );
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
}

export default admin;