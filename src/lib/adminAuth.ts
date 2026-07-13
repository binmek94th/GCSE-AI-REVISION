import { NextRequest } from 'next/server';
import admin from '@/lib/firebaseAdmin';

/**
 * ⚠️ Placeholder admin check against a `role: 'admin'` field on the user
 * doc — same assumption flagged when we built the tutor-creation route
 * earlier. Swap for your real admin-gating pattern if different.
 */
export async function requireAdmin(req: NextRequest): Promise<string | null> {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return null;
    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        const userDoc = await admin.firestore().collection('users').doc(decoded.uid).get();
        if (userDoc.data()?.role !== 'admin') return null;
        return decoded.uid;
    } catch {
        return null;
    }
}