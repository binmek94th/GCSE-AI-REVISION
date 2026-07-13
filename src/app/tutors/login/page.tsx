'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Loader2, Users } from 'lucide-react';

export default function TutorLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/tutors/dashboard');
        } catch (err) {
            setError('Invalid email or password');
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
                    <CardTitle className="text-2xl">Partner Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 cursor-pointer" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Log in'}
                        </Button>

                        <p className="text-xs text-center text-gray-500">
                            No account yet?{' '}
                            <a href="/tutors/signup" className="text-blue-600 hover:underline">Sign up</a>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}