'use client'

import {JSX, useState} from 'react';
import { Smile, Meh, Frown, Heart, X } from 'lucide-react';

interface MoodOption {
    value: string;
    label: string;
    icon: JSX.Element;
    color: string;
    bgColor: string;
}

interface Props {
    onClose: () => void;
    onSubmit: (mood: string) => Promise<void>;
}

const moods: MoodOption[] = [
    {
        value: 'great',
        label: 'Great',
        icon: <Heart className="w-8 h-8" />,
        color: 'text-green-900',
        bgColor: 'bg-green-200 hover:bg-green-200 border-green-300'
    },
    {
        value: 'good',
        label: 'Good',
        icon: <Smile className="w-8 h-8" />,
        color: 'text-green-600',
        bgColor: 'bg-green-50 hover:bg-green-100 border-green-200'
    },
    {
        value: 'okay',
        label: 'Okay',
        icon: <Meh className="w-8 h-8" />,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'
    },
    {
        value: 'stressed',
        label: 'Stressed',
        icon: <Frown className="w-8 h-8" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
    },
    {
        value: 'bad',
        label: 'Not Good',
        icon: <Frown className="w-8 h-8" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50 hover:bg-red-100 border-red-200'
    }
];

export function MoodChecker({ onClose, onSubmit }: Props) {
    const [selectedMood, setSelectedMood] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedMood) return;

        setSubmitting(true);
        try {
            await onSubmit(selectedMood);
            onClose();
        } catch (error) {
            console.error('Error submitting mood:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        How are you feeling today? 😊
                    </h2>
                    <p className="text-gray-600 text-sm">
                        Let us know how you&#39;re doing so we can support your learning journey
                    </p>
                </div>

                <div className="grid grid-cols-5 gap-3 mb-6">
                    {moods.map((mood) => (
                        <button
                            key={mood.value}
                            onClick={() => setSelectedMood(mood.value)}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                                selectedMood === mood.value
                                    ? `${mood.bgColor} border-current shadow-md scale-105`
                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className={selectedMood === mood.value ? mood.color : 'text-gray-400'}>
                                {mood.icon}
                            </div>
                            <span className={`text-xs mt-2 font-medium ${
                                selectedMood === mood.value ? mood.color : 'text-gray-600'
                            }`}>
                                {mood.label}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedMood || submitting}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                            selectedMood && !submitting
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg cursor-pointer'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </div>
        </div>
    );
}