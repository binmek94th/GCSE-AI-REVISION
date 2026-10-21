'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Loader2, Users } from 'lucide-react';
import { normalizeAuthErrorCode, isCredentialError, signupErrorMessage } from '@/lib/authErrors';

export default function TutorSignupPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const registerAsTutorAndContinue = async (idToken: string, alreadyVerified: boolean) => {
        const res = await fetch('/api/tutors/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ name }),
        });

        if (!res.ok) {
            const e2 = await res.json();
            throw new Error(e2.error || 'Failed to register');
        }

        if (alreadyVerified) {
            router.push('/tutors/dashboard');
            return;
        }

        // No code is sent here: /tutors/verify-email sends one automatically
        // when it loads. Sending (and waiting) here as well made signup
        // slower and caused that page's own send to hit the resend cooldown.
        router.push('/tutors/verify-email');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let idToken: string;
            let emailVerified: boolean;

            try {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                idToken = await cred.user.getIdToken();
                emailVerified = cred.user.emailVerified;
            } catch (createErr: unknown) {
                const code = normalizeAuthErrorCode(createErr);

                // This email already has an account (e.g. an existing
                // student). Try signing in with the credentials they just
                // submitted: if that works it's genuinely their account and
                // we attach a tutor role to it.
                //
                // The check below used to compare against
                // 'oauth-callback/email-already-in-use', which Firebase never
                // returns (the real code is 'auth/email-already-in-use', and
                // sometimes only the raw EMAIL_EXISTS body comes back), so
                // this branch never ran and every failure showed the same
                // generic message.
                if (code === 'auth/email-already-in-use') {
                    try {
                        const signInCred = await signInWithEmailAndPassword(auth, email, password);
                        idToken = await signInCred.user.getIdToken();
                        emailVerified = signInCred.user.emailVerified;
                    } catch (signInErr: unknown) {
                        // Wrong password for the existing account -> say the
                        // account exists. Anything else (network, rate limit)
                        // keeps its own message.
                        const signInCode = normalizeAuthErrorCode(signInErr);
                        throw { code: isCredentialError(signInCode) ? 'auth/email-already-in-use' : signInCode };
                    }
                } else {
                    throw createErr;
                }
            }

            await registerAsTutorAndContinue(idToken, emailVerified);
        } catch (err) {
            console.error('Tutor signup failed:', err);
            setError(signupErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-2xl">Become a StudyCedo Partner</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                        Get your referral link, earn 30% recurring commission for a full year on every student you refer.
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 cursor-pointer" disabled={loading}>
                            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</> : 'Get my referral link'}
                        </Button>

                        <p className="text-xs text-center text-gray-500">
                            Already have an account?{' '}
                            <a href="/tutors/login" className="text-blue-600 hover:underline">Log in</a>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}