'use client'
import { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Sparkles, Trash2 } from 'lucide-react';
import { onAuthStateChanged} from "firebase/auth";
import {useRouter} from "next/navigation";
import {auth} from "@/lib/firebase";

interface RawMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface DisplayMessage {
    role: "user" | "assistant";
    content: React.ReactNode;
    timestamp: Date;
}

export default function StudentAIChat() {
    const [rawMessages, setRawMessages] = useState<RawMessage[]>([
        {
            role: 'assistant',
            content: "Hi there! 👋 I'm your AI study buddy. Ask me anything about your homework, concepts you're learning, or any topic you'd like to explore!",
            timestamp: new Date()
        }
    ]);
    const router = useRouter()

    const [user, setUser] = useState<any>(null);
    const [disabled, setDisabled] = useState(false)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);


    const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([
        {
            role: 'assistant',
            content: <p>Hi there! 👋 I&#39;m your AI study buddy. Ask me anything about your homework, concepts you're learning, or any topic you'd like to explore!</p>,
            timestamp: new Date()
        }
    ]);

    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [displayMessages]);

    function renderMessage(msg: string): React.ReactNode {
        try {
            const data = JSON.parse(msg);
            return (
                <div>
                    <h2 className="font-bold text-lg">{data.title}</h2>
                    {data.sections.map((sec: any, i: number) => (
                        <div key={i} className="mt-2">
                            <h3 className="font-semibold">{sec.heading}</h3>
                            <ul className="list-disc pl-5">
                                {sec.content.map((point: string, j: number) => (
                                    <li key={j}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            );
        } catch {
            return <p>{msg}</p>;
        }
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMessage: RawMessage = {
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setRawMessages(prev => [...prev, userMessage]);
        setDisplayMessages(prev => [
            ...prev,
            { ...userMessage, content: <p>{input}</p> }
        ]);
        setInput('');
        setIsTyping(true);

        if (!user){
            router.push('/auth/login');
            return;
        }
        const idToken = await user.getIdToken();
        if (!idToken) {
            router.push('/auth/login');
            return;
        }

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json",  "Authorization": `Bearer ${idToken}` },
                body: JSON.stringify({ messages: [...rawMessages, userMessage] })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Unknown error");
            }
            const data = await res.json();

            if (data.content) {
                const aiRaw: RawMessage = {
                    role: "assistant",
                    content: data.content,
                    timestamp: new Date(),
                };
                const aiDisplay: DisplayMessage = {
                    role: "assistant",
                    content: renderMessage(data.content),
                    timestamp: new Date(),
                };

                setRawMessages(prev => [...prev, aiRaw]);
                setDisplayMessages(prev => [...prev, aiDisplay]);
            }
        } catch (error: any) {
            const errorMessage =
                typeof error === "string"
                    ? error
                    : error?.message || "⚠️ Sorry, something went wrong. Please try again.";


            const errRaw: RawMessage = {
                role: 'assistant',
                content: errorMessage,
                timestamp: new Date()
            };

            const errDisplay: DisplayMessage = {
                ...errRaw,
                content: <p>{errorMessage}</p>
            };

            setRawMessages(prev => [...prev, errRaw]);
            setDisplayMessages(prev => [...prev, errDisplay]);

            if (errorMessage.includes("Insufficient tokens")) {
                setDisabled(true)
                setDisplayMessages(prev => [...prev, {
                    ...errRaw,
                    content: <p>Redirecting to token top-up...</p>
                }]);
                setTimeout(() => {
                    router.push("/token?redirectTo=/chat");
                }, 3000)
            }
        } finally {
            setIsTyping(false);
        }
    };

    const formatTime = (date: Date) =>
        new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });

    const clearChat = () => {
        const starter: RawMessage = {
            role: 'assistant',
            content: "Hi there! 👋 I'm your AI study buddy. Ask me anything about your homework, concepts you're learning, or any topic you'd like to explore!",
            timestamp: new Date()
        };
        setRawMessages([starter]);
        setDisplayMessages([{ ...starter, content: <p>{starter.content}</p> }]);
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl">
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">AI Study Assistant</h1>
                            <p className="text-sm text-gray-500">Your personal learning companion</p>
                        </div>
                    </div>
                    <button
                        onClick={clearChat}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {displayMessages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                    message.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                        : 'bg-white text-gray-800 shadow-md border border-gray-100'
                                }`}
                            >
                                {message.role === 'assistant' && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-4 h-4 text-purple-500" />
                                        <span className="text-xs font-semibold text-purple-600">AI Assistant</span>
                                    </div>
                                )}
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {message.content}
                                </div>
                                <span className={`text-xs mt-2 block ${
                                    message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                                }`}>
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
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300" />
                                    </div>
                                    <span className="text-xs text-gray-500">AI is thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="bg-white border-t border-gray-200 shadow-lg">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything about your studies..."
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-400"
                            disabled={isTyping}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping || disabled}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-lg hover:shadow-xl"
                        >
                            <Send className="w-5 h-5" />
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
