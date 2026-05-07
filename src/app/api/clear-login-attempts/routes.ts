// app/api/clear-login-attempts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import admin  from '@/lib/firebaseAdmin';

const emailToDocId = (email: string) =>
    email.toLowerCase().replace(/\./g, '_dot_').replace(/@/g, '_at_');

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        const docId = emailToDocId(email);
        await admin.firestore().collection('users_login_attempts').doc(docId).delete();

        return NextResponse.json({ success: true });
    } catch (err) {
        // Non-fatal — don't block the user if this fails
        console.error('Failed to clear login attempts:', err);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}