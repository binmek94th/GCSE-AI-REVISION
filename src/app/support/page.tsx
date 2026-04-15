'use client'
import dynamic from 'next/dynamic';

const SupportChat = dynamic(() => import('@/app/components/SupportChat'), { ssr: false });

export default function SupportPage() {
    return (
        <div style={{
            height: '89vh',
            display: 'flex',
            width: '100%',
            justifyContent: 'center',
            background: '#f0f4ff',
        }}>
            <div style={{width: "58%"}}>
                <SupportChat />
            </div>
        </div>
    );
}