'use client'
import React, { JSX } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MarkdownContentProps {
    content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
    const parseMarkdown = (text: string) => {
        const lines = text.split('\n');
        const elements: JSX.Element[] = [];
        let listItems: Array<{ text: string; equations: string[] }> = [];
        let listKey = 0;
        let currentListItem: { text: string; equations: string[] } | null = null;
        let inDisplayMath = false;
        let currentMath = '';
        let tableBuffer: string[] = [];
        let inTable = false;

        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`list-${listKey++}`} style={{ marginLeft: 24, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {listItems.map((item, idx) => (
                            <li key={idx} style={{ color: '#475569', listStyleType: 'disc' }}>
                                <div>
                                    {parseInlineElements(item.text)}
                                    {item.equations.map((eq, eqIdx) => (
                                        <div key={`eq-${eqIdx}`} style={{ margin: '8px 0', overflowX: 'auto' }}>
                                            <BlockMath math={eq} />
                                        </div>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                );
                listItems = [];
            }
        };

        const flushTable = (key: number) => {
            if (tableBuffer.length < 2) {
                tableBuffer = [];
                inTable = false;
                return;
            }

            // Parse rows — split on | and trim
            const parseRow = (row: string) =>
                row.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);

            // Separator row check (e.g. |---|---|)
            const isSeparator = (row: string) => /^\|[\s\-|:]+\|$/.test(row.trim());

            const headerRow = tableBuffer[0];
            const bodyRows = tableBuffer.slice(2); // skip header + separator

            const headers = parseRow(headerRow);
            const rows = bodyRows.filter(r => !isSeparator(r)).map(parseRow);

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
                        {rows.map((row, ri) => (
                            <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                                {row.map((cell, ci) => (
                                    <td key={ci} style={{
                                        padding: '10px 14px',
                                        color: '#475569',
                                        borderBottom: ri < rows.length - 1 ? '1px solid #E2E8F0' : 'none',
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

        const parseInlineElements = (line: string): (string | JSX.Element)[] => {
            const parts: (string | JSX.Element)[] = [];
            let key = 0;
            const inlineMathRegex = /\\\(([\s\S]*?)\\\)|\$([^\$]+?)\$/g;
            let match;
            let lastIndex = 0;

            while ((match = inlineMathRegex.exec(line)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(...parseBoldAndItalic(line.substring(lastIndex, match.index), key));
                    key += 100;
                }
                const mathContent = match[1] || match[2];
                parts.push(
                    <span key={`inline-math-${key++}`} style={{ display: 'inline-block', margin: '0 2px' }}>
                        <InlineMath math={mathContent.trim()} />
                    </span>
                );
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < line.length) {
                parts.push(...parseBoldAndItalic(line.substring(lastIndex), key));
            }

            return parts.length > 0 ? parts : [line];
        };

        const parseBoldAndItalic = (text: string, startKey: number): (string | JSX.Element)[] => {
            const parts: (string | JSX.Element)[] = [];
            let key = startKey;
            const boldRegex = /\*\*(.+?)\*\*/g;
            let match;
            let lastIndex = 0;

            while ((match = boldRegex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(...parseItalic(text.substring(lastIndex, match.index), key));
                    key += 100;
                }
                parts.push(
                    <strong key={`bold-${key++}`} style={{ fontWeight: 600, color: '#0F172A' }}>
                        {match[1]}
                    </strong>
                );
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < text.length) {
                parts.push(...parseItalic(text.substring(lastIndex), key));
            }

            return parts.length > 0 ? parts : [text];
        };

        const parseItalic = (text: string, startKey: number): (string | JSX.Element)[] => {
            const parts: (string | JSX.Element)[] = [];
            let key = startKey;
            const italicRegex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
            let match;
            let lastIndex = 0;

            while ((match = italicRegex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(text.substring(lastIndex, match.index));
                }
                parts.push(
                    <em key={`italic-${key++}`} style={{ fontStyle: 'italic', color: '#334155' }}>
                        {match[1]}
                    </em>
                );
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < text.length) {
                parts.push(text.substring(lastIndex));
            }

            return parts.length > 0 ? parts : [text];
        };

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();

            // ── Display math start ──────────────────────────────────────
            if (trimmedLine.startsWith('\\[') || trimmedLine.startsWith('$$')) {
                inDisplayMath = true;
                currentMath = trimmedLine.replace(/^\\\[|^\$\$/g, '');
                if (trimmedLine.endsWith('\\]') || (trimmedLine.endsWith('$$') && trimmedLine.length > 2)) {
                    currentMath = currentMath.replace(/\\\]$|\$\$$/g, '').trim();
                    inDisplayMath = false;
                    if (currentListItem) {
                        currentListItem.equations.push(currentMath);
                    } else {
                        elements.push(
                            <div key={`dm-${index}`} style={{ margin: '16px 0', overflowX: 'auto' }}>
                                <BlockMath math={currentMath} />
                            </div>
                        );
                    }
                    currentMath = '';
                }
                return;
            }

            // ── Display math end ────────────────────────────────────────
            if (inDisplayMath && (trimmedLine.endsWith('\\]') || trimmedLine.endsWith('$$'))) {
                currentMath += '\n' + trimmedLine.replace(/\\\]$|\$\$$/g, '');
                inDisplayMath = false;
                if (currentListItem) {
                    currentListItem.equations.push(currentMath.trim());
                } else {
                    elements.push(
                        <div key={`dm-${index}`} style={{ margin: '16px 0', overflowX: 'auto' }}>
                            <BlockMath math={currentMath.trim()} />
                        </div>
                    );
                }
                currentMath = '';
                return;
            }

            if (inDisplayMath) {
                currentMath += '\n' + line;
                return;
            }

            // ── Table detection ─────────────────────────────────────────
            const isTableRow = trimmedLine.startsWith('|') && trimmedLine.endsWith('|');
            if (isTableRow) {
                if (currentListItem) { listItems.push(currentListItem); currentListItem = null; }
                flushList();
                inTable = true;
                tableBuffer.push(trimmedLine);
                return;
            }
            if (inTable && !isTableRow) {
                flushTable(index);
            }

            // ── Image: ![alt](url) ──────────────────────────────────────
            const imageRegex = /^!\[([^\]]*)\]\(([^)]+)\)$/;
            const imageMatch = trimmedLine.match(imageRegex);
            if (imageMatch) {
                if (currentListItem) { listItems.push(currentListItem); currentListItem = null; }
                flushList();
                const [, alt, src] = imageMatch;
                elements.push(
                    <figure key={`img-${index}`} style={{ margin: '16px 0', textAlign: 'center' }}>
                        <img
                            src={src}
                            alt={alt}
                            style={{
                                maxWidth: '100%',
                                height: 'auto',
                                borderRadius: 8,
                                border: '1px solid #E2E8F0',
                                display: 'inline-block'
                            }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        {alt && (
                            <figcaption style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
                                {alt}
                            </figcaption>
                        )}
                    </figure>
                );
                return;
            }

            // ── H1 ──────────────────────────────────────────────────────
            if (line.startsWith('# ') && !line.startsWith('## ')) {
                if (currentListItem) { listItems.push(currentListItem); currentListItem = null; }
                flushList();
                elements.push(
                    <h1 key={`h1-${index}`} style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: '24px 0 12px' }}>
                        {line.replace('# ', '')}
                    </h1>
                );
            }
            // ── H2 ──────────────────────────────────────────────────────
            else if (line.startsWith('## ') && !line.startsWith('### ')) {
                if (currentListItem) { listItems.push(currentListItem); currentListItem = null; }
                flushList();
                elements.push(
                    <h2 key={`h2-${index}`} style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: '#0F172A',
                        margin: '24px 0 12px',
                        paddingBottom: 8,
                        borderBottom: '1px solid #E2E8F0'
                    }}>
                        {line.replace('## ', '')}
                    </h2>
                );
            }
            // ── H3 ──────────────────────────────────────────────────────
            else if (line.startsWith('### ')) {
                if (currentListItem) { listItems.push(currentListItem); currentListItem = null; }
                flushList();
                elements.push(
                    <h3 key={`h3-${index}`} style={{ fontSize: 17, fontWeight: 600, color: '#0F172A', margin: '20px 0 8px' }}>
                        {line.replace('### ', '')}
                    </h3>
                );
            }
            // ── List item ────────────────────────────────────────────────
            else if (trimmedLine.match(/^[-*]\s+/) || trimmedLine.match(/^\d+\.\s+/)) {
                if (currentListItem) listItems.push(currentListItem);
                const itemText = trimmedLine.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
                currentListItem = { text: itemText, equations: [] };
            }
            // ── Empty line ───────────────────────────────────────────────
            else if (trimmedLine === '') {
                if (currentListItem) { listItems.push(currentListItem); currentListItem = null; }
                flushList();
                elements.push(<div key={`space-${index}`} style={{ height: 8 }} />);
            }
            // ── Paragraph ────────────────────────────────────────────────
            else {
                if (currentListItem) { listItems.push(currentListItem); currentListItem = null; }
                flushList();
                elements.push(
                    <p key={`p-${index}`} style={{ marginBottom: 12, color: '#475569', lineHeight: 1.7 }}>
                        {parseInlineElements(line)}
                    </p>
                );
            }
        });

        // Flush any remaining state
        if (currentListItem) listItems.push(currentListItem);
        flushList();
        if (inTable) flushTable(lines.length);

        return elements;
    };

    return (
        <div style={{ maxWidth: '100%', lineHeight: 1.7, color: '#475569' }}>
            {parseMarkdown(content)}
        </div>
    );
}