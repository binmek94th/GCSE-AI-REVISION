'use client'
import React, { JSX, useEffect, useRef, useState } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MarkdownContentProps {
    content: string;
}

// ── Figures ──────────────────────────────────────────────────────────────────
// A line that is only an image: ![alt text](url). The alt group is greedy because
// alt text can legitimately contain [ ] (e.g. "Diagram 6 — [IMAGE_5]").
const IMAGE_LINE_RE = /^!\[(.*)\]\(([^)]+)\)$/;

// The italic caption some materials put under an image: *Figure 6*, _Fig. 2: The cell_
const FIGURE_CAPTION_RE = /^([*_])\s*(?:Figure|Fig\.?)\s*\d+[^*_]*\1$/i;

// The extraction pipeline sometimes leaves a placeholder where the picture should
// be (nothing, "#", "IMAGE_5", "[IMAGE_5]") — there is no image to try to load.
const isPlaceholderSrc = (src: string) => {
    const t = src.trim();
    return !t || t === '#' || /^\[?\s*IMAGE[\s_-]*\d+\s*\]?$/i.test(t) || /^(null|undefined)$/i.test(t);
};

/**
 * An image with its labels. If the picture doesn't exist (placeholder link) or
 * can't be loaded (404, broken link), the WHOLE figure is dropped — including
 * the "Diagram 6 — [IMAGE_5]" label and the "Figure 6" caption — so the lesson
 * never says there's a diagram where there isn't one.
 */
function MarkdownFigure({ src, alt, caption }: { src: string; alt: string; caption?: React.ReactNode }) {
    const [failed, setFailed] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // A different image gets a fresh attempt.
    useEffect(() => {
        setFailed(false);
    }, [src]);

    // If the image already failed before this component hydrated, the browser's
    // error event has come and gone, so onError never fires — check directly.
    useEffect(() => {
        const img = imgRef.current;
        if (img && img.complete && img.naturalWidth === 0 && !/\.svg(\?|#|$)/i.test(src)) setFailed(true);
    }, [src]);

    if (failed || isPlaceholderSrc(src)) return null;

    return (
        <>
            <figure style={{ margin: '16px 0', textAlign: 'center' }}>
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, border: '1px solid #E2E8F0' }}
                    onError={() => setFailed(true)}
                />
                {alt && <figcaption style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>{alt}</figcaption>}
            </figure>
            {caption}
        </>
    );
}

export function MarkdownContent({ content }: MarkdownContentProps) {
    const parseMarkdown = (text: string) => {
        const lines = text.split('\n');
        const elements: JSX.Element[] = [];

        // List state
        interface ListItem { text: string; equations: string[]; ordered: boolean; indent: number; isCheckbox?: boolean; checked?: boolean }
        let listItems: ListItem[] = [];
        let listKey = 0;
        let currentListItem: ListItem | null = null;

        // Display math state
        let inDisplayMath = false;
        let currentMath = '';

        // Table state
        let tableBuffer: string[] = [];
        let inTable = false;

        // Code block state
        let inCodeBlock = false;
        let codeBlockLines: string[] = [];
        let codeBlockLang = '';
        let codeKey = 0;

        // ── Flush helpers ──────────────────────────────────────────────

        const flushList = () => {
            if (listItems.length === 0) return;

            const buildList = (items: ListItem[], depth: number): JSX.Element => {
                const isOrdered = items[0]?.ordered ?? false;
                const Tag = isOrdered ? 'ol' : 'ul';
                return React.createElement(
                    Tag,
                    {
                        key: `list-${listKey++}`,
                        style: {
                            marginLeft: depth === 0 ? 0 : 20,
                            marginBottom: depth === 0 ? 16 : 4,
                            paddingLeft: 24,
                            display: 'flex',
                            flexDirection: 'column' as const,
                            gap: 6,
                            listStyleType: isOrdered ? 'decimal' : 'disc',
                        }
                    },
                    items.map((item, idx) => (
                        <li
                            key={idx}
                            style={{
                                color: '#475569',
                                listStyleType: item.isCheckbox ? 'none' : undefined,
                            }}
                        >
                            {item.isCheckbox ? (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginLeft: -20 }}>
                                    <input
                                        type="checkbox"
                                        checked={!!item.checked}
                                        readOnly
                                        disabled
                                        style={{
                                            marginTop: 5,
                                            width: 15,
                                            height: 15,
                                            accentColor: '#3B82F6',
                                            cursor: 'default',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <div style={{
                                        textDecoration: item.checked ? 'line-through' : 'none',
                                        color: item.checked ? '#94A3B8' : '#475569',
                                    }}>
                                        {parseInlineElements(item.text)}
                                        {item.equations.map((eq, eqIdx) => (
                                            <div key={`eq-${eqIdx}`} style={{ margin: '8px 0', overflowX: 'auto' }}>
                                                <BlockMath math={eq} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {parseInlineElements(item.text)}
                                    {item.equations.map((eq, eqIdx) => (
                                        <div key={`eq-${eqIdx}`} style={{ margin: '8px 0', overflowX: 'auto' }}>
                                            <BlockMath math={eq} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </li>
                    ))
                );
            };

            elements.push(buildList(listItems, 0));
            listItems = [];
        };

        const flushTable = (key: number) => {
            if (tableBuffer.length < 2) { tableBuffer = []; inTable = false; return; }

            const parseRow = (row: string) =>
                row.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);

            const isSeparator = (row: string) => /^\|[\s\-|:]+\|$/.test(row.trim());

            const headers = parseRow(tableBuffer[0]);
            const bodyRows = tableBuffer.slice(2).filter(r => !isSeparator(r)).map(parseRow);

            elements.push(
                <div key={`table-${key}`} style={{ overflowX: 'auto', marginBottom: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                        <tr style={{ backgroundColor: '#F0F9FF' }}>
                            {headers.map((h, i) => (
                                <th key={i} style={{
                                    padding: '10px 14px',
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    color: '#0C4A6E',
                                    borderBottom: '1px solid #BAE6FD',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {parseInlineElements(h)}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {bodyRows.map((row, ri) => (
                            <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                                {row.map((cell, ci) => (
                                    <td key={ci} style={{
                                        padding: '10px 14px',
                                        color: '#475569',
                                        borderBottom: ri < bodyRows.length - 1 ? '1px solid #E2E8F0' : 'none',
                                        lineHeight: 1.55
                                    }}>
                                        {parseInlineElements(cell)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            );

            tableBuffer = [];
            inTable = false;
        };

        const flushCodeBlock = (key: number) => {
            elements.push(
                <div key={`code-block-${key}`} style={{ margin: '16px 0', borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                    {codeBlockLang && (
                        <div style={{
                            backgroundColor: '#1E293B',
                            color: '#94A3B8',
                            fontSize: 12,
                            padding: '6px 14px',
                            fontFamily: 'monospace',
                            borderBottom: '1px solid #334155'
                        }}>
                            {codeBlockLang}
                        </div>
                    )}
                    <pre style={{
                        backgroundColor: '#0F172A',
                        color: '#E2E8F0',
                        margin: 0,
                        padding: '14px 16px',
                        overflowX: 'auto',
                        fontSize: 13,
                        lineHeight: 1.6,
                        fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
                    }}>
                        <code>{codeBlockLines.join('\n')}</code>
                    </pre>
                </div>
            );
            codeBlockLines = [];
            codeBlockLang = '';
            inCodeBlock = false;
        };

        // ── Inline parsers ─────────────────────────────────────────────

        const parseInlineElements = (line: string): (string | JSX.Element)[] => {
            const parts: (string | JSX.Element)[] = [];
            let key = 0;

            // Combined regex for all inline patterns:
            // inline math: \(...\) or $...$
            // inline code: `...`
            const inlineRegex = /\\\(([\s\S]*?)\\\)|\$([^\$\n]+?)\$|`([^`]+)`/g;
            let match;
            let lastIndex = 0;

            while ((match = inlineRegex.exec(line)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(...parseTextFormatting(line.substring(lastIndex, match.index), key));
                    key += 100;
                }
                if (match[1] !== undefined || match[2] !== undefined) {
                    // Inline math
                    const mathContent = match[1] ?? match[2];
                    parts.push(
                        <span key={`inline-math-${key++}`} style={{ display: 'inline-block', margin: '0 2px' }}>
                            <InlineMath math={mathContent.trim()} />
                        </span>
                    );
                } else if (match[3] !== undefined) {
                    // Inline code
                    parts.push(
                        <code key={`inline-code-${key++}`} style={{
                            backgroundColor: '#F1F5F9',
                            color: '#0F172A',
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontSize: '0.875em',
                            fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
                            border: '1px solid #E2E8F0'
                        }}>
                            {match[3]}
                        </code>
                    );
                }
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < line.length) {
                parts.push(...parseTextFormatting(line.substring(lastIndex), key));
            }

            return parts.length > 0 ? parts : [line];
        };

        const parseTextFormatting = (text: string, startKey: number): (string | JSX.Element)[] => {
            // Handle bold+italic, bold, italic, strikethrough, links in sequence
            const parts: (string | JSX.Element)[] = [];
            let key = startKey;
            // Regex covers: ***bold+italic***, **bold**, *italic*, ~~strikethrough~~, [text](url)
            const regex = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|~~(.+?)~~|\[([^\]]+)\]\(([^)]+)\)/g;
            let match;
            let lastIndex = 0;

            while ((match = regex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(text.substring(lastIndex, match.index));
                }
                if (match[1]) {
                    parts.push(<strong key={`bi-${key++}`} style={{ fontWeight: 700, fontStyle: 'italic', color: '#0F172A' }}>{match[1]}</strong>);
                } else if (match[2]) {
                    parts.push(<strong key={`b-${key++}`} style={{ fontWeight: 600, color: '#0F172A' }}>{match[2]}</strong>);
                } else if (match[3]) {
                    parts.push(<em key={`i-${key++}`} style={{ fontStyle: 'italic', color: '#334155' }}>{match[3]}</em>);
                } else if (match[4]) {
                    parts.push(<del key={`s-${key++}`} style={{ color: '#94A3B8' }}>{match[4]}</del>);
                } else if (match[5] && match[6]) {
                    parts.push(
                        <a key={`a-${key++}`} href={match[6]} target="_blank" rel="noopener noreferrer"
                           style={{ color: '#0284C7', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                            {match[5]}
                        </a>
                    );
                }
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < text.length) parts.push(text.substring(lastIndex));
            return parts.length > 0 ? parts : [text];
        };

        // ── Main line loop ─────────────────────────────────────────────

        const flushNonListState = () => {
            if (currentListItem) { listItems.push(currentListItem); currentListItem = null; }
            flushList();
        };

        // Pair each image with the italic "Figure N" caption under it (blank lines
        // in between are skipped), so the caption appears and disappears with its
        // image instead of being left behind on its own.
        const figureCaptionAfter = new Map<number, number>();
        const consumedCaptionLines = new Set<number>();
        {
            let inFence = false;
            for (let i = 0; i < lines.length; i++) {
                const t = lines[i].trim();
                if (t.startsWith('```')) { inFence = !inFence; continue; }
                if (inFence || !IMAGE_LINE_RE.test(t)) continue;
                let j = i + 1;
                while (j < lines.length && lines[j].trim() === '') j++;
                if (j < lines.length && FIGURE_CAPTION_RE.test(lines[j].trim())) {
                    figureCaptionAfter.set(i, j);
                    consumedCaptionLines.add(j);
                }
            }
        }

        lines.forEach((line, index) => {
            // Rendered together with the image above it (see MarkdownFigure).
            if (consumedCaptionLines.has(index)) return;

            const trimmedLine = line.trim();

            // ── Code block ───────────────────────────────────────────────
            if (trimmedLine.startsWith('```')) {
                if (!inCodeBlock) {
                    flushNonListState();
                    inCodeBlock = true;
                    codeBlockLang = trimmedLine.slice(3).trim();
                } else {
                    flushCodeBlock(codeKey++);
                }
                return;
            }
            if (inCodeBlock) {
                codeBlockLines.push(line);
                return;
            }

            // ── Display math start ───────────────────────────────────────
            if (trimmedLine.startsWith('\\[') || trimmedLine === '$$') {
                flushNonListState();
                inDisplayMath = true;
                currentMath = trimmedLine.replace(/^\\\[|^\$\$/, '');
                if ((trimmedLine.endsWith('\\]') || trimmedLine.endsWith('$$')) && trimmedLine.length > 2) {
                    currentMath = currentMath.replace(/\\\]$|\$\$$/, '').trim();
                    inDisplayMath = false;
                    elements.push(<div key={`dm-${index}`} style={{ margin: '16px 0', overflowX: 'auto' }}><BlockMath math={currentMath} /></div>);
                    currentMath = '';
                }
                return;
            }
            if (inDisplayMath) {
                if (trimmedLine.endsWith('\\]') || trimmedLine.endsWith('$$')) {
                    currentMath += '\n' + trimmedLine.replace(/\\\]$|\$\$$/, '');
                    inDisplayMath = false;
                    elements.push(<div key={`dm-${index}`} style={{ margin: '16px 0', overflowX: 'auto' }}><BlockMath math={currentMath.trim()} /></div>);
                    currentMath = '';
                } else {
                    currentMath += '\n' + line;
                }
                return;
            }

            // ── Table ────────────────────────────────────────────────────
            const isTableRow = trimmedLine.startsWith('|') && trimmedLine.endsWith('|');
            if (isTableRow) {
                flushNonListState();
                inTable = true;
                tableBuffer.push(trimmedLine);
                return;
            }
            if (inTable && !isTableRow) {
                flushTable(index);
            }

            // ── Horizontal rule ──────────────────────────────────────────
            if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmedLine)) {
                flushNonListState();
                elements.push(
                    <hr key={`hr-${index}`} style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '24px 0' }} />
                );
                return;
            }

            // ── Image ────────────────────────────────────────────────────
            const imageMatch = trimmedLine.match(IMAGE_LINE_RE);
            if (imageMatch) {
                flushNonListState();
                const [, alt, src] = imageMatch;
                const captionLine = figureCaptionAfter.get(index);
                const caption = captionLine !== undefined ? (
                    <p key={`cap-${index}`} style={{ marginBottom: 12, color: '#475569', lineHeight: 1.7 }}>
                        {parseInlineElements(lines[captionLine].trim())}
                    </p>
                ) : undefined;
                elements.push(<MarkdownFigure key={`img-${index}`} src={src} alt={alt} caption={caption} />);
                return;
            }

            // ── Blockquote ───────────────────────────────────────────────
            if (trimmedLine.startsWith('> ')) {
                flushNonListState();
                elements.push(
                    <blockquote key={`bq-${index}`} style={{
                        borderLeft: '3px solid #BAE6FD',
                        backgroundColor: '#F0F9FF',
                        margin: '12px 0',
                        padding: '10px 16px',
                        borderRadius: '0 6px 6px 0',
                        color: '#0C4A6E',
                        fontStyle: 'italic',
                    }}>
                        {parseInlineElements(trimmedLine.slice(2))}
                    </blockquote>
                );
                return;
            }

            // ── Headings H1–H6 ───────────────────────────────────────────
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                flushNonListState();
                const level = headingMatch[1].length;
                const headingText = headingMatch[2];
                const headingStyles: Record<number, React.CSSProperties> = {
                    1: { fontSize: 26, fontWeight: 700, color: '#0F172A', margin: '28px 0 12px', paddingBottom: 8, borderBottom: '2px solid #E2E8F0' },
                    2: { fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '24px 0 12px', paddingBottom: 6, borderBottom: '1px solid #E2E8F0' },
                    3: { fontSize: 18, fontWeight: 600, color: '#0F172A', margin: '20px 0 8px' },
                    4: { fontSize: 16, fontWeight: 600, color: '#1E293B', margin: '16px 0 6px' },
                    5: { fontSize: 14, fontWeight: 600, color: '#334155', margin: '12px 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
                    6: { fontSize: 13, fontWeight: 600, color: '#475569', margin: '10px 0 4px' },
                };
                elements.push(
                    React.createElement(
                        `h${level}`,
                        { key: `h${level}-${index}`, style: headingStyles[level] },
                        parseInlineElements(headingText)
                    )
                );
                return;
            }

            // ── Checkbox / task-list items ("- [ ] text" / "- [x] text") ───
            // Must be checked before the generic ordered/unordered list match,
            // since "- [ ] text" would otherwise match the unordered pattern
            // and render the literal "[ ]" as text.
            const checkboxMatch = trimmedLine.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/);
            if (checkboxMatch) {
                if (currentListItem) listItems.push(currentListItem);
                const checked = checkboxMatch[1].toLowerCase() === 'x';
                const itemText = checkboxMatch[2];
                const indentLevel = line.match(/^(\s*)/)?.[1].length ?? 0;
                currentListItem = { text: itemText, equations: [], ordered: false, indent: indentLevel, isCheckbox: true, checked };
                return;
            }

            // ── List items ───────────────────────────────────────────────
            const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
            const unorderedMatch = trimmedLine.match(/^[-*+]\s+(.+)$/);

            if (orderedMatch || unorderedMatch) {
                if (currentListItem) listItems.push(currentListItem);
                const itemText = orderedMatch ? orderedMatch[2] : unorderedMatch![1];
                const isOrdered = !!orderedMatch;
                const indentLevel = line.match(/^(\s*)/)?.[1].length ?? 0;
                currentListItem = { text: itemText, equations: [], ordered: isOrdered, indent: indentLevel };
                return;
            }

            // ── Empty line ───────────────────────────────────────────────
            if (trimmedLine === '') {
                flushNonListState();
                elements.push(<div key={`space-${index}`} style={{ height: 8 }} />);
                return;
            }

            // ── Continuation of list item (indented content) ─────────────
            if (currentListItem && line.match(/^\s{2,}/)) {
                currentListItem.text += ' ' + trimmedLine;
                return;
            }

            // ── Paragraph ────────────────────────────────────────────────
            flushNonListState();
            elements.push(
                <p key={`p-${index}`} style={{ marginBottom: 12, color: '#475569', lineHeight: 1.7 }}>
                    {parseInlineElements(line)}
                </p>
            );
        });

        // Flush remaining state
        if (currentListItem) listItems.push(currentListItem);
        flushList();
        if (inTable) flushTable(lines.length);
        if (inCodeBlock) flushCodeBlock(codeKey++);

        return elements;
    };

    return (
        <div style={{ maxWidth: '100%', lineHeight: 1.7, color: '#475569' }}>
            {parseMarkdown(content)}
        </div>
    );
}