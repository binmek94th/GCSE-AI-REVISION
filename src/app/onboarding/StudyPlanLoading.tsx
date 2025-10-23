// components/StudyPlanLoading.tsx
'use client'

import { Brain, Sparkles, BookOpen, Target } from 'lucide-react';
import { useEffect, useState } from 'react';

const loadingSteps = [
    { icon: Brain, text: "Analyzing your quiz results...", duration: 2000 },
    { icon: Target, text: "Identifying areas for improvement...", duration: 2000 },
    { icon: BookOpen, text: "Finding the best study materials...", duration: 2000 },
    { icon: Sparkles, text: "Creating your personalized plan...", duration: 2000 }
];

export function StudyPlanLoading() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger fade-in animation
        setTimeout(() => setIsVisible(true), 50);
    }, []);

    useEffect(() => {
        if (currentStep < loadingSteps.length - 1) {
            const timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, loadingSteps[currentStep].duration);

            return () => clearTimeout(timer);
        }
    }, [currentStep]);

    return (
        <div className={`flex py-5 items-center justify-center min-h-[400px] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl transition-all duration-700 ease-out ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
            <div className="text-center max-w-md px-6">
                {/* Animated Icon */}
                <div className={`relative mb-8 transition-all duration-500 delay-100 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 bg-indigo-100 rounded-full animate-ping opacity-20"></div>
                    </div>
                    <div className="relative flex items-center justify-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                            {loadingSteps.map((step, index) => {
                                const Icon = step.icon;
                                return (
                                    <Icon
                                        key={index}
                                        className={`w-10 h-10 text-white absolute transition-all duration-500 ${
                                            index === currentStep
                                                ? 'opacity-100 scale-100'
                                                : 'opacity-0 scale-50'
                                        }`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Message */}
                <h3 className={`text-2xl font-bold text-gray-900 mb-2 transition-all duration-500 delay-200 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                    Generating Your Study Plan
                </h3>
                <p className={`text-gray-600 mb-6 transition-all duration-500 delay-300 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                    This may take a moment...
                </p>

                {/* Loading Steps */}
                <div className={`space-y-3 transition-all duration-500 delay-400 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                    {loadingSteps.map((step, index) => (
                        <div
                            key={index}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                                index === currentStep
                                    ? 'bg-indigo-50 border-2 border-indigo-200'
                                    : index < currentStep
                                        ? 'bg-green-50 border-2 border-green-200'
                                        : 'bg-gray-50 border-2 border-gray-200'
                            }`}
                        >
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                index < currentStep
                                    ? 'bg-green-500'
                                    : index === currentStep
                                        ? 'bg-indigo-500'
                                        : 'bg-gray-300'
                            }`}>
                                {index < currentStep ? (
                                    <svg
                                        className="w-4 h-4 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                ) : index === currentStep ? (
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                ) : (
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                )}
                            </div>
                            <span className={`text-sm font-medium ${
                                index === currentStep
                                    ? 'text-indigo-700'
                                    : index < currentStep
                                        ? 'text-green-700'
                                        : 'text-gray-500'
                            }`}>
                                {step.text}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Progress Bar */}
                <div className={`mt-6 w-full bg-gray-200 rounded-full h-2 overflow-hidden transition-all duration-500 delay-500 ${
                    isVisible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                }`}>
                    <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-500 ease-out"
                        style={{
                            width: `${((currentStep + 1) / loadingSteps.length) * 100}%`
                        }}
                    ></div>
                </div>

                <p className={`text-xs text-gray-500 mt-4 transition-all duration-500 delay-600 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                    AI is analyzing your performance to create the perfect study plan for you
                </p>
            </div>
        </div>
    );
}