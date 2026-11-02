'use client';

import { useState } from 'react';
import { MessageCircle, Upload } from 'lucide-react';
import StudentAIChat from '@/app/dashboard/chat/page';
import UploadTab from '@/app/dashboard/upload/UploadTab';
import { GatedFeature } from '@/app/components/GatedFeature';

export type AITutorView = 'chat' | 'upload';

interface Props {
    /** Which side is showing. */
    view: AITutorView;
    onViewChange: (view: AITutorView) => void;
}

const VIEWS: { value: AITutorView; label: string; icon: typeof MessageCircle; hint: string }[] = [
    { value: 'chat', label: 'Chat', icon: MessageCircle, hint: 'Ask your AI tutor anything about your studies' },
    { value: 'upload', label: 'Upload material', icon: Upload, hint: 'Turn your notes or a file into study material' },
];

const PILL =
    'flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer ' +
    'data-[active=true]:bg-gradient-to-r data-[active=true]:from-blue-500 data-[active=true]:to-indigo-600 ' +
    'data-[active=true]:text-white data-[active=true]:shadow-md text-gray-600 hover:bg-gray-100 data-[active=true]:hover:bg-none';

/**
 * One tab for everything the AI does with the student's own work: chat with the AI tutor,
 * or upload material for it. (These used to be two separate dashboard tabs, "Tutor" and "Upload".)
 *
 * Each side keeps its own access check (so the upgrade message still names the right feature).
 * A side is created the first time it's opened and then kept (just hidden), so flipping between
 * them doesn't throw away a half-written chat or a half-filled upload form.
 */
export default function AITutorTab({ view, onViewChange }: Props) {
    const [opened, setOpened] = useState<Set<AITutorView>>(() => new Set([view]));
    // A view that's showing counts as opened, even if the parent switched it (e.g. from the address bar).
    const visited = opened.has(view) ? opened : new Set(opened).add(view);

    const choose = (next: AITutorView) => {
        if (next === view) return;
        setOpened((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
        onViewChange(next);
    };

    return (
        <div className="">
            <div className="flex flex-col items-center gap-1">
                <div role="tablist" aria-label="AI tutor" className="inline-flex gap-1 rounded-xl border border-gray-200 bg-white shadow-sm">
                    {VIEWS.map(({ value, label, icon: Icon }) => (
                        <button
                            key={value}
                            role="tab"
                            id={`ai-tutor-tab-${value}`}
                            aria-selected={view === value}
                            aria-controls={`ai-tutor-panel-${value}`}
                            data-active={view === value}
                            onClick={() => choose(value)}
                            className={PILL}
                        >
                            <Icon className="h-4 w-4" /> {label}
                        </button>
                    ))}
                </div>
                {/*<p className="text-xs text-gray-500">{VIEWS.find((v) => v.value === view)?.hint}</p>*/}
            </div>

            {visited.has('chat') && (
                <div role="tabpanel" id="ai-tutor-panel-chat" aria-labelledby="ai-tutor-tab-chat" className={view === 'chat' ? '' : 'hidden'}>
                    <GatedFeature featureName="Tutors">
                        <div className="w-[80%] mx-auto">
                            <StudentAIChat />
                        </div>
                    </GatedFeature>
                </div>
            )}

            {visited.has('upload') && (
                <div
                    role="tabpanel"
                    id="ai-tutor-panel-upload"
                    aria-labelledby="ai-tutor-tab-upload"
                    className={view === 'upload' ? 'p-2' : 'hidden p-1'}
                >                    <GatedFeature featureName="Upload Material">
                        <UploadTab />
                    </GatedFeature>
                </div>
            )}
        </div>
    );
}
