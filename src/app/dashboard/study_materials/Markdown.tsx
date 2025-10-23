import React, {JSX} from 'react';

interface MarkdownContentProps {
    content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
    const parseMarkdown = (text: string) => {
        const lines = text.split('\n');
        const elements: JSX.Element[] = [];
        let listItems: string[] = [];
        let listKey = 0;

        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`list-${listKey++}`} className="ml-6 mb-4 space-y-2">
                        {listItems.map((item, idx) => (
                            <li key={idx} className="text-gray-700 list-disc">
                                {parseBoldAndItalic(item)}
                            </li>
                        ))}
                    </ul>
                );
                listItems = [];
            }
        };

        const parseBoldAndItalic = (line: string) => {
            // Parse **bold** and *italic*
            const parts: (string | JSX.Element)[] = [];
            const remaining = line;
            let key = 0;

            // Handle **bold**
            const boldRegex = /\*\*(.+?)\*\*/g;
            let match;
            let lastIndex = 0;

            while ((match = boldRegex.exec(remaining)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(remaining.substring(lastIndex, match.index));
                }
                parts.push(
                    <strong key={`bold-${key++}`} className="font-semibold text-gray-900">
                        {match[1]}
                    </strong>
                );
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < remaining.length) {
                parts.push(remaining.substring(lastIndex));
            }

            return parts.length > 0 ? parts : line;
        };

        lines.forEach((line, index) => {
            // H1 heading (# )
            if (line.startsWith('# ') && !line.startsWith('## ') && !line.startsWith('### ')) {
                flushList();
                elements.push(
                    <h1 key={`h1-${index}`} className="text-3xl font-bold text-gray-900 mt-6 mb-4">
                        {line.replace('# ', '')}
                    </h1>
                );
            }
            // H2 heading (## )
            else if (line.startsWith('## ') && !line.startsWith('### ')) {
                flushList();
                elements.push(
                    <h2 key={`h2-${index}`} className="text-2xl font-bold text-gray-900 mt-6 mb-4 pb-2 border-b-2 border-indigo-200">
                        {line.replace('## ', '')}
                    </h2>
                );
            }
            // H3 heading (### )
            else if (line.startsWith('### ')) {
                flushList();
                elements.push(
                    <h3 key={`h3-${index}`} className="text-xl font-semibold text-gray-900 mt-5 mb-3">
                        {line.replace('### ', '')}
                    </h3>
                );
            }
            // List item (- or 1. )
            else if (line.trim().match(/^[-*]\s+/) || line.trim().match(/^\d+\.\s+/)) {
                const item = line.trim().replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
                listItems.push(item);
            }
            // Empty line
            else if (line.trim() === '') {
                flushList();
                elements.push(<div key={`space-${index}`} className="h-2" />);
            }
            // Regular paragraph
            else {
                flushList();
                elements.push(
                    <p key={`p-${index}`} className="mb-3 text-gray-700 leading-relaxed">
                        {parseBoldAndItalic(line)}
                    </p>
                );
            }
        });

        flushList(); // Flush any remaining list items

        return elements;
    };

    return (
        <div className="prose prose-lg max-w-none ">
            {parseMarkdown(content)}
        </div>
    );
}