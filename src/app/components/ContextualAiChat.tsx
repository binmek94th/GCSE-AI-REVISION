'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Sparkles } from 'lucide-react';
import { auth } from "@/lib/firebase";
import {usePathname, useRouter, useSearchParams} from "next/navigation";

interface RawMessage {
    role: "user" | "assistant";
    content: string;
    timestamp?: Date;
}

interface DisplayMessage {
    role: "user" | "assistant";
    content: React.ReactNode;
    timestamp: Date;
}

interface StudyContext {
    materialId: string;
    materialTitle: string;
    subject: string;
    content: string;
    packId: string;
}

interface ContextualAIChatProps {
    materialId: string;
    materialTitle: string;
    subject: string;
    packId: string;
    contentSelector?: string;
}

export default function ContextualAiChat({
                                             materialId,
                                             materialTitle,
                                             subject,
                                             packId,
                                             contentSelector = '.study-content',
                                         }: ContextualAIChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [rawMessages, setRawMessages] = useState<RawMessage[]>([]);
    const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [studyContext, setStudyContext] = useState<StudyContext | null>(null);
    const [disabled, setDisabled] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname()
    const searchParams = useSearchParams();

    // Subject color mapping
    const subjectColors: { [key: string]: string } = {
        Mathematics: 'from-blue-500 to-blue-600',
        English: 'from-purple-500 to-purple-600',
        Chemistry: 'from-green-500 to-green-600',
        Biology: 'from-emerald-500 to-emerald-600',
        Physics: 'from-orange-500 to-orange-600',
    };

    const buttonGradient = subjectColors[subject] || 'from-indigo-500 to-purple-600';

    // Extract study material content from the page
    const extractPageContext = (): StudyContext => {
        const contentElement = document.querySelector(contentSelector);
        const content = contentElement?.textContent || '';

        // Limit content to ~4000 characters to manage token usage
        const trimmedContent = content.length > 4000
            ? content.substring(0, 4000) + '...'
            : content;

        return {
            materialId,
            materialTitle,
            subject,
            packId,
            content: trimmedContent,
        };
    };

    // Scan the page when popup opens
    useEffect(() => {
        if (isOpen && !studyContext) {
            const context = extractPageContext();
            setStudyContext(context);

            const welcomeMsg = `Hi! 👋 I can see you're studying **${materialTitle}** in ${subject}. I have the content of this material, so feel free to ask me anything about it!`;
            const welcomeRaw: RawMessage = {
                role: 'assistant',
                content: welcomeMsg,
                timestamp: new Date()
            };

            setRawMessages([welcomeRaw]);
            setDisplayMessages([{
                role: 'assistant',
                content: renderMessage(welcomeMsg),
                timestamp: new Date()
            }]);
        }
    }, [isOpen]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [displayMessages]);

    // Render message with JSON parsing for AI responses
    const renderMessage = (msg: string): React.ReactNode => {
        try {
            const data = JSON.parse(msg);
            return (
                <div>
                    <h2 className="font-bold text-lg mb-2">{data.title}</h2>
                    {data.sections.map((sec: any, i: number) => (
                        <div key={i} className="mt-3">
                            <h3 className="font-semibold text-base mb-1">{sec.heading}</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                {sec.content.map((point: string, j: number) => (
                                    <li key={j}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            );
        } catch {
            // Parse markdown-style bold text
            return (
                <p className="whitespace-pre-wrap">
                    {msg.split('**').map((part, i) =>
                        i % 2 === 0 ? part : <strong key={i}>{part}</strong>
                    )}
                </p>
            );
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || isTyping || !studyContext) return;

        const userInput = input.trim();
        setInput('');

        const user = auth.currentUser;
        if (!user) {
            router.push("/auth/login");
            return;
        }

        // Create contextual message by prepending study context
        const contextualPrompt = `[STUDY CONTEXT - You are helping with: "${materialTitle}" (${subject})]

**Material Content:**
${studyContext.content}

**Student's Question:**
${userInput}

Please answer the student's question specifically about this study material. Reference the content above when relevant.`;

        const userMessage: RawMessage = {
            role: "user",
            content: contextualPrompt,
            timestamp: new Date()
        };

        // Display only the user's actual question, not the full context
        const displayUserMessage: DisplayMessage = {
            role: "user",
            content: <p>{userInput}</p>,
            timestamp: new Date()
        };

        setRawMessages(prev => [...prev, userMessage]);
        setDisplayMessages(prev => [...prev, displayUserMessage]);
        setIsTyping(true);

        try {
            const idToken = await user.getIdToken();
            if (!idToken) {
                router.push("/auth/login");
                return;
            }

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ messages: [...rawMessages, userMessage] }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.allowed === false) {
                    setDisabled(true);
                    const errorMsg = data.message || "You need a subscription to continue.";

                    setDisplayMessages(prev => [
                        ...prev,
                        {
                            role: "assistant",
                            content: <p>{errorMsg}</p>,
                            timestamp: new Date()
                        },
                    ]);
                    const params = new URLSearchParams(searchParams.toString());

                    params.delete("materialId");

                    const currentUrl = pathname + (searchParams?.toString() ? `?${params.toString()}` : "");

                    setTimeout(() => {
                        router.push(`/token?redirectTo=${encodeURIComponent(currentUrl)}`);
                    }, 3000);

                    return;
                }
                throw new Error(data.error || "Failed to get response");
            }

            if (data.data?.content) {
                const aiRaw: RawMessage = {
                    role: "assistant",
                    content: data.data.content,
                    timestamp: new Date()
                };
                const aiDisplay: DisplayMessage = {
                    role: "assistant",
                    content: renderMessage(data.data.content),
                    timestamp: new Date()
                };

                setRawMessages(prev => [...prev, aiRaw]);
                setDisplayMessages(prev => [...prev, aiDisplay]);
            }
        } catch (error: any) {
            const errorMessage = error?.message || "⚠️ Sorry, something went wrong. Please try again.";
            const errDisplay: DisplayMessage = {
                role: "assistant",
                content: <p>{errorMessage}</p>,
                timestamp: new Date()
            };
            setDisplayMessages(prev => [...prev, errDisplay]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (date: Date) =>
        new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={`fixed bottom-6 right-6 bg-gradient-to-r ${buttonGradient} text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-50 flex items-center gap-2 group`}
                    aria-label="Open AI Chat"
                >
                    <MessageCircle size={24} />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-medium">
                        Ask about this material
                    </span>
                </button>
            )}

            {/* Chat Popup */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-xl shadow-2xl z-50 flex flex-col border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${buttonGradient} text-white p-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Sparkles size={20} className="flex-shrink-0" />
                            <div className="min-w-0">
                                <h3 className="font-semibold text-sm">AI Study Assistant</h3>
                                <p className="text-xs opacity-90 truncate">{subject} - {materialTitle}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-white/20 p-1 rounded transition-colors flex-shrink-0 ml-2"
                            aria-label="Close chat"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        {displayMessages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                        message.role === 'user'
                                            ? `bg-gradient-to-br ${buttonGradient} text-white`
                                            : 'bg-white text-gray-800 shadow-md border border-gray-100'
                                    }`}
                                >
                                    {message.role === 'assistant' && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles className="w-4 h-4 text-purple-500" />
                                            <span className="text-xs font-semibold text-purple-600">AI Assistant</span>
                                        </div>
                                    )}
                                    <div className="text-sm leading-relaxed">
                                        {message.content}
                                    </div>
                                    <span
                                        className={`text-xs mt-2 block ${
                                            message.role === 'user' ? 'text-white/70' : 'text-gray-400'
                                        }`}
                                    >
                                        {formatTime(message.timestamp)}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white rounded-2xl px-4 py-3 shadow-md border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        </div>
                                        <span className="text-xs text-gray-500">AI is thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-gray-200 bg-white">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask about this material..."
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 placeholder-gray-400"
                                disabled={isTyping || disabled}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!input.trim() || isTyping || disabled}
                                className={`bg-gradient-to-r ${buttonGradient} text-white px-4 py-2 rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2`}
                                aria-label="Send message"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            💡 I have access to this study material content
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}