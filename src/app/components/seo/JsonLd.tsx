// Renders structured data (JSON-LD) for search engines. Safe in server AND client components.
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
    return (
        <script
            type="application/ld+json"
            // "<" is escaped so the data can never close the script tag early.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
        />
    );
}

export function faqSchema(items: { question: string; answer: string }[]) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map(({ question, answer }) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
        })),
    };
}
