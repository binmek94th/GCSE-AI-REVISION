'use client'

import { Brain, Sparkles, BookOpen, Target } from 'lucide-react';
import { useEffect, useState } from 'react';

const loadingSteps = [
    { icon: Brain, text: "Analysing your quiz results..." },
    { icon: Target, text: "Identifying areas for improvement..." },
    { icon: BookOpen, text: "Finding the best study materials..." },
    { icon: Sparkles, text: "Creating your personalised plan..." }
];

export function StudyPlanLoading() {
    const [currentStep, setCurrentStep] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (currentStep < loadingSteps.length - 1) {
            const t = setTimeout(() => setCurrentStep(s => s + 1), 2000);
            return () => clearTimeout(t);
        }
    }, [currentStep]);

    return (
        <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '40px 32px',
            textAlign: 'center',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease'
        }}>
            {/* Icon */}
            <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: '#F0F9FF',
                border: '1px solid #BAE6FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                position: 'relative'
            }}>
                {loadingSteps.map((step, i) => {
                    const Icon = step.icon;
                    return (
                        <Icon
                            key={i}
                            style={{
                                width: 24,
                                height: 24,
                                color: '#0EA5E9',
                                position: 'absolute',
                                opacity: i === currentStep ? 1 : 0,
                                transform: i === currentStep ? 'scale(1)' : 'scale(0.6)',
                                transition: 'all 0.4s ease'
                            }}
                        />
                    );
                })}
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                Generating your study plan
            </h3>
            <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>
                This may take a moment...
            </p>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, margin: '0 auto 24px' }}>
                {loadingSteps.map((step, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: i === currentStep
                            ? '1px solid #BAE6FD'
                            : i < currentStep
                                ? '1px solid #E0F2FE'
                                : '1px solid #E2E8F0',
                        backgroundColor: i === currentStep
                            ? '#F0F9FF'
                            : i < currentStep
                                ? '#F0F9FF'
                                : '#F8FAFC',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{
                            flexShrink: 0,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: i < currentStep ? '#0EA5E9' : i === currentStep ? '#0EA5E9' : '#E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.3s ease'
                        }}>
                            {i < currentStep ? (
                                <svg width="10" height="10" viewBox="0 0 12 10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="1.5,5 4.5,8 10.5,1.5" />
                                </svg>
                            ) : i === currentStep ? (
                                <div style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    animation: 'pulse 1s infinite'
                                }} />
                            ) : (
                                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#94A3B8' }} />
                            )}
                        </div>
                        <span style={{
                            fontSize: 13,
                            color: i === currentStep ? '#0C4A6E' : i < currentStep ? '#0369A1' : '#94A3B8',
                            fontWeight: i === currentStep ? 500 : 400
                        }}>
                            {step.text}
                        </span>
                    </div>
                ))}
            </div>

            {/* Progress bar */}
            <div style={{
                height: 4,
                backgroundColor: '#E2E8F0',
                borderRadius: 99,
                overflow: 'hidden',
                maxWidth: 360,
                margin: '0 auto'
            }}>
                <div style={{
                    height: '100%',
                    width: `${((currentStep + 1) / loadingSteps.length) * 100}%`,
                    backgroundColor: '#0EA5E9',
                    borderRadius: 99,
                    transition: 'width 0.5s ease'
                }} />
            </div>
        </div>
    );
}