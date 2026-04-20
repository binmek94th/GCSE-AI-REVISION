'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface Escalation {
    reason: string;
    contact: string;
}

function parseEscalation(text: string): Escalation | null {
    const match = text.match(/ESCALATE:(\{.*\})$/m);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch { return null; }
}

function stripEscalation(text: string): string {
    return text.replace(/\nESCALATE:\{.*\}$/m, '').trim();
}

function formatText(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>[\s\S]*?<\/li>)+/g, m => `<ul style="padding-left:18px;margin-top:6px">${m}</ul>`)
        .replace(/\n/g, '<br/>');
}

const QUICK_TOPICS = [
    { label: '🔐 Login help',      msg: 'I cannot log into my account' },
    { label: '🚀 Getting started', msg: 'How do I get started with StudyCedo?' },
    { label: '💷 Pricing',         msg: 'How much does StudyCedo  cost?' },
    { label: '🤖 AI Tutor',        msg: 'How does the AI tutor work?' },
    { label: '📅 Study plan',      msg: 'How does my study plan work?' },
    { label: '📖 Subjects',        msg: 'What subjects does StudyCedo  cover?' },
    { label: '📝 Exam boards',     msg: 'What exam boards do you support?' },
    { label: '❌ Cancel',          msg: 'I want to cancel my subscription' },
];

const SUGGESTIONS = [
    { label: "🔐 Can't log in",  msg: 'I cannot log in' },
    { label: '💷 Pricing',       msg: 'How much does StudyCedo  cost and what is included?' },
    { label: '🤖 AI Tutor',      msg: 'How does the AI tutor work?' },
    { label: '📅 Study plan',    msg: 'How does my personalised study plan work?' },
    { label: '📖 Subjects',      msg: 'What subjects and exam boards do you cover?' },
    { label: '💬 Refund',        msg: 'I want a refund' },
];

export default function SupportChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages, loading]);

    function getTime() {
        return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }

    async function send(text?: string) {
        const msg = text ?? input.trim();
        if (!msg || loading) return;
        setInput('');

        const newMessages: Message[] = [...messages, { role: 'user', content: msg }];
        setMessages(newMessages);
        setLoading(true);

        try {
            const res = await fetch('/api/support-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages }),
            });
            const data = await res.json();
            const reply: string = data.reply ?? "I'm having trouble connecting. Please email support@Studycedo.com.";
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please try again or email support@Studycedo.com.",
            }]);
        }

        setLoading(false);
        inputRef.current?.focus();
    }

    function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    }

    function clearChat() { setMessages([]); setInput(''); }

    // ── Styles ────────────────────────────────────────────────────────────
    const s = {
        wrap: {
            display: 'flex', flexDirection: 'column' as const,
            height: '100%', minHeight: 0,
            background: '#f0f4ff',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
        } as React.CSSProperties,

        header: {
            background: '#fff', borderBottom: '1.5px solid #e2e8f8',
            padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
            flexShrink: 0, boxShadow: '0 4px 24px rgba(14,165,233,0.08)', zIndex: 10,
        } as React.CSSProperties,

        logoMark: {
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #0EA5E9, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 2px 12px rgba(14,165,233,0.3)',
        } as React.CSSProperties,

        resetBtn: {
            background: '#f7f9ff', border: '1.5px solid #e2e8f8', color: '#64748b',
            padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto',
        } as React.CSSProperties,

        quickBar: {
            background: '#fff', borderBottom: '1.5px solid #e2e8f8',
            padding: '8px 20px', display: 'flex', gap: 7,
            overflowX: 'auto' as const, flexShrink: 0, scrollbarWidth: 'none' as const,
        } as React.CSSProperties,

        chip: {
            background: '#f7f9ff', border: '1.5px solid #e2e8f8', color: '#64748b',
            padding: '5px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0,
        } as React.CSSProperties,

        chatArea: {
            flex: 1, overflowY: 'auto' as const, padding: 20,
            display: 'flex', flexDirection: 'column' as const, gap: 14,
            minHeight: 0,
        } as React.CSSProperties,

        inputArea: {
            background: '#fff', borderTop: '1.5px solid #e2e8f8',
            padding: '14px 20px', flexShrink: 0,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.04)',
        } as React.CSSProperties,

        inputWrap: {
            display: 'flex', gap: 9, alignItems: 'flex-end',
        } as React.CSSProperties,

        inputInner: {
            flex: 1, background: '#f7f9ff', border: '1.5px solid #e2e8f8',
            borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center',
        } as React.CSSProperties,

        textarea: {
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: '#0f172a', fontFamily: 'inherit', fontSize: 13.5, resize: 'none' as const,
            maxHeight: 100, lineHeight: 1.5,
        } as React.CSSProperties,

        sendBtn: (disabled: boolean) => ({
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: disabled
                ? '#e2e8f8'
                : 'linear-gradient(135deg, #0EA5E9, #0284C7)',
            border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: disabled ? 'none' : '0 2px 12px rgba(14,165,233,0.3)',
            transition: 'all .2s',
        } as React.CSSProperties),
    };

    return (
        <>
            {/* Google Font */}
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>

            <div style={s.wrap}>

                {/* Header */}
                <div style={s.header}>
                    <div style={s.logoMark}>📚</div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>StudyCedo  Support</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'DM Mono, monospace', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                            AI Assistant · replies instantly
                        </div>
                    </div>
                    <button style={s.resetBtn} onClick={clearChat}>↺ New chat</button>
                </div>

                {/* Quick chips */}
                <div style={s.quickBar}>
                    {QUICK_TOPICS.map(t => (
                        <div key={t.label} style={s.chip} onClick={() => send(t.msg)}>{t.label}</div>
                    ))}
                </div>

                {/* Chat messages */}
                <div style={s.chatArea} ref={chatRef}>

                    {/* Welcome screen */}
                    {messages.length === 0 && (
                        <div style={{
                            background: '#fff', border: '1.5px solid #e2e8f8', borderRadius: 20,
                            padding: 26, textAlign: 'center', boxShadow: '0 4px 24px rgba(14,165,233,0.08)',
                        }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px',
                                background: 'linear-gradient(135deg, #0EA5E9, #7c3aed)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 24, boxShadow: '0 4px 16px rgba(14,165,233,0.3)',
                            }}>📚</div>
                            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                                Hi! I&#39;m the StudyCedo  Support Assistant
                            </div>
                            <div style={{ color: '#64748b', fontSize: 12.5, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
                                I can help with login issues, your study plan, the AI tutor, billing, and more.
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginTop: 18 }}>
                                {SUGGESTIONS.map(s => (
                                    <div key={s.label} onClick={() => send(s.msg)} style={{
                                        background: '#f7f9ff', border: '1.5px solid #e2e8f8', color: '#64748b',
                                        padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    }}>{s.label}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Message list */}
                    {messages.map((m, i) => {
                        const isUser = m.role === 'user';
                        const esc = !isUser ? parseEscalation(m.content) : null;
                        const displayText = !isUser ? stripEscalation(m.content) : m.content;

                        return (
                            <div key={i}>
                                <div style={{ display: 'flex', gap: 9, flexDirection: isUser ? 'row-reverse' : 'row' }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                                        background: isUser
                                            ? 'linear-gradient(135deg, #0f172a, #334155)'
                                            : 'linear-gradient(135deg, #0EA5E9, #7c3aed)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: isUser ? 11 : 13, fontWeight: 700, color: '#fff',
                                        boxShadow: isUser ? 'none' : '0 2px 8px rgba(14,165,233,0.25)',
                                    }}>
                                        {isUser ? 'You' : '🤖'}
                                    </div>

                                    <div style={{ maxWidth: '78%' }}>
                                        <div style={{
                                            fontSize: 10.5, color: '#94a3b8', marginBottom: 4,
                                            fontFamily: 'DM Mono, monospace',
                                            textAlign: isUser ? 'right' : 'left',
                                        }}>
                                            {isUser ? 'You' : 'StudyCedo  Support'} · {getTime()}
                                        </div>
                                        <div style={{
                                            padding: '11px 15px', borderRadius: 20, fontSize: 13.5, lineHeight: 1.65,
                                            background: isUser ? 'linear-gradient(135deg, #0EA5E9, #0284C7)' : '#fff',
                                            color: isUser ? '#fff' : '#0f172a',
                                            border: isUser ? 'none' : '1.5px solid #e2e8f8',
                                            borderBottomLeftRadius: isUser ? 20 : 5,
                                            borderBottomRightRadius: isUser ? 5 : 20,
                                            boxShadow: isUser
                                                ? '0 2px 12px rgba(14,165,233,0.28)'
                                                : '0 2px 10px rgba(0,0,0,0.04)',
                                        }}
                                             dangerouslySetInnerHTML={{ __html: formatText(displayText) }}
                                        />
                                    </div>
                                </div>

                                {/* Escalation banner */}
                                {esc && (
                                    <div style={{
                                        marginTop: 10, marginLeft: 39,
                                        background: '#fff7ed', border: '1.5px solid #fed7aa',
                                        borderRadius: 12, padding: '12px 15px',
                                        display: 'flex', gap: 10, alignItems: 'flex-start',
                                    }}>
                                        <span style={{ fontSize: 18, flexShrink: 0 }}>🚨</span>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 3 }}>
                                                Connecting you to our team
                                            </div>
                                            <div style={{ fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
                                                This needs a human touch. Please email{' '}
                                                <a href={`mailto:${esc.contact}`} style={{ color: '#0EA5E9', fontWeight: 700 }}>
                                                    {esc.contact}
                                                </a>{' '}
                                                and we&#39;ll get back to you as soon as possible.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Typing indicator */}
                    {loading && (
                        <div style={{ display: 'flex', gap: 9 }}>
                            <div style={{
                                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                background: 'linear-gradient(135deg, #0EA5E9, #7c3aed)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                            }}>🤖</div>
                            <div style={{
                                background: '#fff', border: '1.5px solid #e2e8f8', borderRadius: 20,
                                borderBottomLeftRadius: 5, padding: '13px 16px',
                                display: 'flex', gap: 5, alignItems: 'center',
                            }}>
                                {[0, 180, 360].map((delay, i) => (
                                    <div key={i} style={{
                                        width: 7, height: 7, borderRadius: '50%',
                                        background: i === 1 ? '#7c3aed' : '#0EA5E9',
                                        animation: `bounce 1.1s ${delay}ms infinite`,
                                    }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Input area */}
                <div style={s.inputArea}>
                    <div style={s.inputWrap}>
                        <div style={s.inputInner}>
              <textarea
                  ref={inputRef}
                  style={s.textarea}
                  rows={1}
                  value={input}
                  placeholder="Ask me anything about StudyCedo…"
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
              />
                        </div>
                        <button
                            style={s.sendBtn(!input.trim() || loading)}
                            disabled={!input.trim() || loading}
                            onClick={() => send()}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"/>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                        </button>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 10.5, color: '#94a3b8', marginTop: 7, fontFamily: 'DM Mono, monospace' }}>
                        StudyCedo  AI Support · Escalates to a human when needed
                    </div>
                </div>

                {/* Bounce keyframe */}
                <style>{`
          @keyframes bounce {
            0%,80%,100% { transform:translateY(0); opacity:.4; }
            40% { transform:translateY(-5px); opacity:1; }
          }
        `}</style>
            </div>
        </>
    );
}