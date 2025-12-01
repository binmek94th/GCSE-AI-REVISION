'use client'
import React, {JSX} from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MarkdownContentProps {
    content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
    const parseMarkdown = (text: string) => {
        const lines = text.split('\n');
        const elements: JSX.Element[] = [];
        let listItems: Array<{text: string, equations: string[]}> = [];
        let listKey = 0;
        let currentListItem: {text: string, equations: string[]} | null = null;
        let inDisplayMath = false;
        let currentMath = '';

        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`list-${listKey++}`} className="ml-6 mb-4 space-y-4">
                        {listItems.map((item, idx) => (
                            <li key={idx} className="text-gray-700 list-disc">
                                <div>
                                    {parseInlineElements(item.text)}
                                    {item.equations.map((eq, eqIdx) => (
                                        <div key={`eq-${eqIdx}`} className="my-2 overflow-x-auto">
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

        const parseInlineElements = (line: string): (string | JSX.Element)[] => {
            const parts: (string | JSX.Element)[] = [];
            let key = 0;

            // Handle inline math \(...\) or $...$
            const inlineMathRegex = /\\\(([\s\S]*?)\\\)|\$([^\$]+?)\$/g;
            let match;
            let lastIndex = 0;

            while ((match = inlineMathRegex.exec(line)) !== null) {
                if (match.index > lastIndex) {
                    const textBefore = line.substring(lastIndex, match.index);
                    parts.push(...parseBoldAndItalic(textBefore, key));
                    key += 100;
                }

                const mathContent = match[1] || match[2];
                parts.push(
                    <span key={`inline-math-${key++}`} className="inline-block mx-1">
                        <InlineMath math={mathContent.trim()} />
                    </span>
                );
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < line.length) {
                const textAfter = line.substring(lastIndex);
                parts.push(...parseBoldAndItalic(textAfter, key));
            }

            return parts.length > 0 ? parts : [line];
        };

        const parseBoldAndItalic = (text: string, startKey: number): (string | JSX.Element)[] => {
            const parts: (string | JSX.Element)[] = [];
            let key = startKey;

            // Handle **bold**
            const boldRegex = /\*\*(.+?)\*\*/g;
            let match;
            let lastIndex = 0;

            while ((match = boldRegex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    const beforeBold = text.substring(lastIndex, match.index);
                    parts.push(...parseItalic(beforeBold, key));
                    key += 100;
                }
                parts.push(
                    <strong key={`bold-${key++}`} className="font-semibold text-gray-900">
                        {match[1]}
                    </strong>
                );
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < text.length) {
                const textAfter = text.substring(lastIndex);
                parts.push(...parseItalic(textAfter, key));
            }

            return parts.length > 0 ? parts : [text];
        };

        const parseItalic = (text: string, startKey: number): (string | JSX.Element)[] => {
            const parts: (string | JSX.Element)[] = [];
            let key = startKey;

            // Handle *italic* (but not **)
            const italicRegex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
            let match;
            let lastIndex = 0;

            while ((match = italicRegex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(text.substring(lastIndex, match.index));
                }
                parts.push(
                    <em key={`italic-${key++}`} className="italic text-gray-800">
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

            // Check for display math start
            if (trimmedLine.startsWith('\\[') || trimmedLine.startsWith('$$')) {
                inDisplayMath = true;
                currentMath = trimmedLine.replace(/^\\\[|^\$\$/g, '');

                // Check if it also ends on the same line
                if (trimmedLine.endsWith('\\]') || trimmedLine.endsWith('$$')) {
                    currentMath = currentMath.replace(/\\\]$|\$\$$/g, '').trim();
                    inDisplayMath = false;

                    if (currentListItem) {
                        // Add equation to current list item
                        currentListItem.equations.push(currentMath);
                    } else {
                        // Standalone equation
                        elements.push(
                            <div key={`display-math-${index}`} className="my-4 overflow-x-auto">
                                <BlockMath math={currentMath} />
                            </div>
                        );
                    }
                    currentMath = '';
                }
                return;
            }

            // Check for display math end
            if (inDisplayMath && (trimmedLine.endsWith('\\]') || trimmedLine.endsWith('$$'))) {
                currentMath += '\n' + trimmedLine.replace(/\\\]$|\$\$$/g, '');
                inDisplayMath = false;

                if (currentListItem) {
                    // Add equation to current list item
                    currentListItem.equations.push(currentMath.trim());
                } else {
                    // Standalone equation
                    elements.push(
                        <div key={`display-math-${index}`} className="my-4 overflow-x-auto">
                            <BlockMath math={currentMath.trim()} />
                        </div>
                    );
                }
                currentMath = '';
                return;
            }

            // Continue building display math
            if (inDisplayMath) {
                currentMath += '\n' + line;
                return;
            }

            // H1 heading (# )
            if (line.startsWith('# ') && !line.startsWith('## ') && !line.startsWith('### ')) {
                if (currentListItem) {
                    listItems.push(currentListItem);
                    currentListItem = null;
                }
                flushList();
                elements.push(
                    <h1 key={`h1-${index}`} className="text-3xl font-bold text-gray-900 mt-6 mb-4">
                        {line.replace('# ', '')}
                    </h1>
                );
            }
            // H2 heading (## )
            else if (line.startsWith('## ') && !line.startsWith('### ')) {
                if (currentListItem) {
                    listItems.push(currentListItem);
                    currentListItem = null;
                }
                flushList();
                elements.push(
                    <h2 key={`h2-${index}`} className="text-2xl font-bold text-gray-900 mt-6 mb-4 pb-2 border-b-2 border-indigo-200">
                        {line.replace('## ', '')}
                    </h2>
                );
            }
            // H3 heading (### )
            else if (line.startsWith('### ')) {
                if (currentListItem) {
                    listItems.push(currentListItem);
                    currentListItem = null;
                }
                flushList();
                elements.push(
                    <h3 key={`h3-${index}`} className="text-xl font-semibold text-gray-900 mt-5 mb-3">
                        {line.replace('### ', '')}
                    </h3>
                );
            }
            // List item (- or * or 1. )
            else if (trimmedLine.match(/^[-*]\s+/) || trimmedLine.match(/^\d+\.\s+/)) {
                // Save previous list item if exists
                if (currentListItem) {
                    listItems.push(currentListItem);
                }

                const itemText = trimmedLine.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
                currentListItem = {
                    text: itemText,
                    equations: []
                };
            }
            // Empty line
            else if (trimmedLine === '') {
                if (currentListItem) {
                    listItems.push(currentListItem);
                    currentListItem = null;
                }
                flushList();
                elements.push(<div key={`space-${index}`} className="h-2" />);
            }
            // Regular paragraph
            else {
                if (currentListItem) {
                    listItems.push(currentListItem);
                    currentListItem = null;
                }
                flushList();
                elements.push(
                    <p key={`p-${index}`} className="mb-3 text-gray-700 leading-relaxed">
                        {parseInlineElements(line)}
                    </p>
                );
            }
        });

        // Flush any remaining list item and list
        if (currentListItem) {
            listItems.push(currentListItem);
        }
        flushList();

        return elements;
    };

    return (
        <div className="prose prose-lg max-w-none">
            {parseMarkdown(content)}
        </div>
    );
}