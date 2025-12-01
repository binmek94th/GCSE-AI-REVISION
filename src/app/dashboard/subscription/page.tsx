'use client';

import dynamic from 'next/dynamic';
import Spinner from '@/app/components/ui/Spinner';

const SubscriptionContent = dynamic(
    () => import('./SubscriptionContent'),
    {
        ssr: false,
        loading: () => (
            <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
                <Spinner />
            </div>
        )
    }
);

export default function SubscriptionPage() {
    return <SubscriptionContent />;
}