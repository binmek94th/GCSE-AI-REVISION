'use client';

import { useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface Props {
    title: string;
    onClose: () => void;
    /** Shows a back arrow (used when there's a list to go back to). */
    onBack?: () => void;
    children: React.ReactNode;
}

/** A simple pop-up for a conversation: full-height sheet on phones, centred card on larger screens. */
export default function ChatModal({ title, onClose, onBack, children }: Props) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="flex h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-[640px] sm:max-w-lg sm:rounded-2xl"
            >
                <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
                    {onBack && (
                        <button onClick={onBack} aria-label="Back" className="rounded-full p-1 text-gray-500 hover:bg-gray-100 cursor-pointer">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    )}
                    <h2 className="flex-1 truncate text-base font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-gray-500 hover:bg-gray-100 cursor-pointer">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="min-h-0 flex-1">{children}</div>
            </div>
        </div>
    );
}
